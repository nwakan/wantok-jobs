const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const router = express.Router();
const { sendOrderConfirmationEmail, sendEmail } = require('../lib/email');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { BANK_DETAILS, activatePlan, rejectOrder, getSubscriptionStatus } = require('../lib/billing');
const { events: notifEvents } = require('../lib/notifications');

// GET /bank-details — Public bank transfer info
router.get('/bank-details', (req, res) => {
  res.json({ bankDetails: BANK_DETAILS });
});

// GET /my/subscription — Employer's current subscription status
router.get('/my/subscription', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const status = getSubscriptionStatus(req.user.id);
    res.json(status);
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// POST / — Create order (employer only)
router.post('/', authenticateToken, requireRole('employer'), validate(schemas.order), (req, res) => {
  try {
    const { plan_id, payment_method, notes } = req.body;
    const employer_id = req.user.id;

    // Validate plan
    const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND active = 1').get(plan_id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // Check for existing pending order for same plan
    const existingPending = db.prepare(
      'SELECT id FROM orders WHERE employer_id = ? AND plan_id = ? AND status = ?'
    ).get(employer_id, plan_id, 'pending');
    if (existingPending) {
      return res.status(409).json({ 
        error: 'You already have a pending order for this plan',
        orderId: existingPending.id,
      });
    }

    // Generate invoice number: WJ-YYYYMMDD-NNNN
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dayCount = db.prepare(
      "SELECT COUNT(*) as n FROM orders WHERE created_at >= date('now')"
    ).get().n + 1;
    const invoice_number = `WJ-${dateStr}-${String(dayCount).padStart(4, '0')}`;

    const result = db.prepare(`
      INSERT INTO orders (employer_id, plan_id, amount, currency, status, payment_method, invoice_number, notes)
      VALUES (?, ?, ?, ?, 'pending', 'bank_transfer', ?, ?)
    `).run(employer_id, plan_id, plan.price, plan.currency, invoice_number, notes);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);

    // Send confirmation email with bank details
    sendOrderConfirmationEmail({ email: req.user.email, name: req.user.name }, order, plan).catch(() => {});

    // Notify admins
    try { notifEvents.onOrderCreated(order, { id: employer_id, name: req.user.name }, plan); } catch(e) {}

    res.status(201).json({
      order,
      bankDetails: BANK_DETAILS,
      instructions: `Please transfer K${plan.price.toLocaleString()} to ${BANK_DETAILS.bank} and use "${invoice_number}" as your payment reference. Your plan will be activated within 24 hours of payment verification.`,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /my — Employer's orders
router.get('/my', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, p.name as plan_name, p.job_limit, p.duration_days
      FROM orders o
      JOIN plans p ON o.plan_id = p.id
      WHERE o.employer_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id);

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /:id — Order detail (owner or admin)
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, p.name as plan_name, p.job_limit, p.duration_days, p.price as plan_price,
             u.name as employer_name, u.email as employer_email
      FROM orders o
      JOIN plans p ON o.plan_id = p.id
      JOIN users u ON o.employer_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ order, bankDetails: order.status === 'pending' ? BANK_DETAILS : undefined });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────

// GET /admin/all — All orders with filters
router.get('/admin/all', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let where = '';
    const params = [];
    if (status) { where = ' WHERE o.status = ?'; params.push(status); }

    const orders = db.prepare(`
      SELECT o.*, p.name as plan_name, p.job_limit, p.price as plan_price,
             u.name as employer_name, u.email as employer_email,
             pe.company_name
      FROM orders o
      JOIN plans p ON o.plan_id = p.id
      JOIN users u ON o.employer_id = u.id
      LEFT JOIN profiles_employer pe ON o.employer_id = pe.user_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const total = db.prepare('SELECT COUNT(*) as count FROM orders' + (status ? ' WHERE status = ?' : ''))
      .get(...(status ? [status] : []));

    // Summary stats
    const stats = {
      pending: db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'pending'").get().n,
      completed: db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'completed'").get().n,
      rejected: db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'rejected'").get().n,
      totalRevenue: db.prepare("SELECT COALESCE(SUM(amount), 0) as n FROM orders WHERE status = 'completed'").get().n,
    };

    res.json({ orders, total: total.count, stats });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PUT /admin/:id/approve — Admin approves payment → activates plan
router.put('/admin/:id/approve', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { payment_ref } = req.body || {};
    const orderId = req.params.id;

    // Save payment reference if provided
    if (payment_ref) {
      db.prepare('UPDATE orders SET payment_ref = ? WHERE id = ?').run(payment_ref, orderId);
    }

    const result = activatePlan(orderId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Get full order info for notifications
    const order = db.prepare(`
      SELECT o.*, u.name, u.email, p.name as plan_name
      FROM orders o JOIN users u ON o.employer_id = u.id JOIN plans p ON o.plan_id = p.id
      WHERE o.id = ?
    `).get(orderId);

    // Notify employer
    if (order) {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, 'order_approved', 'Plan Activated! 🎉', ?, '/dashboard/employer/orders-billing')
      `).run(order.employer_id, `Your ${order.plan_name} plan is now active! You can post up to ${result.plan === 'Enterprise' ? 'unlimited' : order.job_limit || 'more'} jobs. Expires: ${result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : 'Never'}`);

      // Send activation email
      sendEmail({
        to: order.email, toName: order.name, tags: ['billing'],
        subject: `Plan Activated: ${order.plan_name} 🎉`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#16a34a;padding:24px;text-align:center;">
            <h1 style="color:white;margin:0;">WantokJobs</h1>
          </div>
          <div style="padding:24px;">
            <h2>Your ${order.plan_name} plan is now active!</h2>
            <p>Hi ${order.name},</p>
            <p>We have confirmed your payment for the <strong>${order.plan_name}</strong> plan (Invoice: ${order.invoice_number}).</p>
            <p><strong>What you now have access to:</strong></p>
            <ul>
              <li>Post up to ${result.plan === 'Enterprise' ? 'unlimited' : order.job_limit || 'more'} active jobs</li>
              ${result.expiresAt ? `<li>Plan valid until: ${new Date(result.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>` : ''}
            </ul>
            <p style="text-align:center;margin-top:24px;">
              <a href="${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/employer/post-job" style="background:#16a34a;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">Post a Job Now</a>
            </p>
          </div>
        </div>`,
      }).catch(() => {});
    }

    // Log activity
    try {
      db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, 'approve_order', 'order', orderId, JSON.stringify({ plan: result.plan, expiresAt: result.expiresAt }));
    } catch(e) {}

    res.json({
      message: 'Payment approved and plan activated',
      ...result,
    });
  } catch (error) {
    console.error('Error approving order:', error);
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// PUT /admin/:id/reject — Admin rejects order
router.put('/admin/:id/reject', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { reason } = req.body || {};
    const orderId = req.params.id;

    const result = rejectOrder(orderId, reason);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify employer
    const order = db.prepare(`
      SELECT o.*, u.name, u.email, p.name as plan_name
      FROM orders o JOIN users u ON o.employer_id = u.id JOIN plans p ON o.plan_id = p.id
      WHERE o.id = ?
    `).get(orderId);

    if (order) {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, 'order_rejected', 'Order Update', ?, '/dashboard/employer/orders-billing')
      `).run(order.employer_id, `Your order for the ${order.plan_name} plan (${order.invoice_number}) could not be processed. Reason: ${reason || 'Payment not received'}. Please contact support if you believe this is an error.`);
    }

    // Log
    try {
      db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, 'reject_order', 'order', orderId, JSON.stringify({ reason }));
    } catch(e) {}

    res.json({ message: 'Order rejected', reason });
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

// GET /admin/stats — Revenue summary
router.get('/admin/stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const stats = {
      totalRevenue: db.prepare("SELECT COALESCE(SUM(amount), 0) as n FROM orders WHERE status = 'completed'").get().n,
      pendingRevenue: db.prepare("SELECT COALESCE(SUM(amount), 0) as n FROM orders WHERE status = 'pending'").get().n,
      totalOrders: db.prepare('SELECT COUNT(*) as n FROM orders').get().n,
      pendingOrders: db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'pending'").get().n,
      completedOrders: db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'completed'").get().n,
      activeSubscriptions: db.prepare('SELECT COUNT(*) as n FROM profiles_employer WHERE subscription_plan_id IS NOT NULL AND (plan_expires_at IS NULL OR plan_expires_at > datetime(?))').get(new Date().toISOString()).n,
      revenueByPlan: db.prepare(`
        SELECT p.name, COUNT(*) as orders, SUM(o.amount) as revenue
        FROM orders o JOIN plans p ON o.plan_id = p.id
        WHERE o.status = 'completed'
        GROUP BY p.name ORDER BY revenue DESC
      `).all(),
      revenueByMonth: db.prepare(`
        SELECT strftime('%Y-%m', completed_at) as month, SUM(amount) as revenue, COUNT(*) as orders
        FROM orders WHERE status = 'completed' AND completed_at IS NOT NULL
        GROUP BY month ORDER BY month DESC LIMIT 12
      `).all(),
    };

    res.json(stats);
  } catch (error) {
    console.error('Revenue stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
