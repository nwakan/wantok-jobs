const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const { sendOrderConfirmationEmail, sendEmail } = require('../lib/email');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { BANK_DETAILS, approveOrder, rejectOrder, getCreditStatus } = require('../lib/billing');
const { events: notifEvents } = require('../lib/notifications');

// GET /bank-details — Public bank transfer info
router.get('/bank-details', (req, res) => {
  res.json({ bankDetails: BANK_DETAILS });
});

// GET /my/credits — User's credit status (convenience alias)
router.get('/my/credits', authenticateToken, (req, res) => {
  try {
    const status = getCreditStatus(req.user.id);
    if (!status) return res.status(404).json({ error: 'Profile not found' });
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credit status' });
  }
});

// Legacy compat: GET /my/subscription
router.get('/my/subscription', authenticateToken, (req, res) => {
  try {
    const status = getCreditStatus(req.user.id);
    if (!status) return res.status(404).json({ error: 'Profile not found' });
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// POST / — Create order (purchase a credit package)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { package_id, payment_method, notes } = req.body;
    if (!package_id) return res.status(400).json({ error: 'package_id required' });
    
    const userId = req.user.id;

    // Validate package
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    if (pkg.target_role !== req.user.role) {
      return res.status(400).json({ error: `This package is for ${pkg.target_role}s` });
    }
    if (pkg.price === 0) return res.status(400).json({ error: 'Cannot purchase a free package' });

    // Check for existing pending order for same package
    const existingPending = db.prepare(
      'SELECT id FROM orders WHERE COALESCE(user_id, employer_id) = ? AND package_id = ? AND status = ?'
    ).get(userId, package_id, 'pending');
    if (existingPending) {
      return res.status(409).json({ 
        error: 'You already have a pending order for this package',
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
      INSERT INTO orders (employer_id, user_id, package_id, plan_id, amount, currency, status, payment_method, invoice_number, notes)
      VALUES (?, ?, ?, 0, ?, ?, 'pending', ?, ?, ?)
    `).run(userId, userId, package_id, pkg.price, pkg.currency, payment_method || 'bank_transfer', invoice_number, notes);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);

    // Send confirmation email with bank details
    sendOrderConfirmationEmail({ email: req.user.email, name: req.user.name }, order, pkg).catch(() => {});

    // Notify admins
    try { notifEvents.onOrderCreated(order, { id: userId, name: req.user.name }, pkg); } catch(e) {}

    res.status(201).json({
      order,
      bankDetails: BANK_DETAILS,
      instructions: `Please transfer K${pkg.price.toLocaleString()} to ${BANK_DETAILS.bank} and use "${invoice_number}" as your payment reference. Your credits will be added within 24 hours of payment verification.`,
    });
  } catch (error) {
    logger.error('Error creating order', { error: error.message });
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /my — User's orders
router.get('/my', authenticateToken, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, p.name as package_name, 
             p.job_posting_credits, p.ai_matching_credits, p.candidate_search_credits, p.alert_credits
      FROM orders o
      LEFT JOIN packages p ON o.package_id = p.id
      WHERE COALESCE(o.user_id, o.employer_id) = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id);

    res.json({ orders });
  } catch (error) {
    logger.error('Error fetching orders', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /:id — Order detail (owner or admin)
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, p.name as package_name, 
             p.job_posting_credits, p.ai_matching_credits, p.candidate_search_credits, p.alert_credits,
             p.description as package_description,
             u.name as user_name, u.email as user_email, u.role as user_role
      FROM orders o
      LEFT JOIN packages p ON o.package_id = p.id
      JOIN users u ON COALESCE(o.user_id, o.employer_id) = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (( order.user_id || order.employer_id ) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ order, bankDetails: order.status === 'pending' ? BANK_DETAILS : undefined });
  } catch (error) {
    logger.error('Error fetching order', { error: error.message });
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
      SELECT o.*, p.name as package_name, p.job_posting_credits, p.alert_credits,
             u.name as user_name, u.email as user_email, u.role as user_role,
             pe.company_name
      FROM orders o
      LEFT JOIN packages p ON o.package_id = p.id
      JOIN users u ON COALESCE(o.user_id, o.employer_id) = u.id
      LEFT JOIN profiles_employer pe ON COALESCE(o.user_id, o.employer_id) = pe.user_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const total = db.prepare('SELECT COUNT(*) as count FROM orders' + (status ? ' WHERE status = ?' : ''))
      .get(...(status ? [status] : []));

    const stats = {
      pending: db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'pending'").get().n,
      completed: db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'completed'").get().n,
      rejected: db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'rejected'").get().n,
      totalRevenue: db.prepare("SELECT COALESCE(SUM(amount), 0) as n FROM orders WHERE status = 'completed'").get().n,
    };

    res.json({ orders, total: total.count, stats });
  } catch (error) {
    logger.error('Error fetching orders', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PUT /admin/:id/approve — Admin approves payment → grants credits
router.put('/admin/:id/approve', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { payment_ref } = req.body || {};
    const orderId = req.params.id;

    if (payment_ref) {
      db.prepare('UPDATE orders SET payment_ref = ? WHERE id = ?').run(payment_ref, orderId);
    }

    const result = approveOrder(orderId, req.user.id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Get order info for notifications
    const order = db.prepare(`
      SELECT o.*, u.name, u.email, p.name as package_name
      FROM orders o 
      JOIN users u ON COALESCE(o.user_id, o.employer_id) = u.id 
      LEFT JOIN packages p ON o.package_id = p.id
      WHERE o.id = ?
    `).get(orderId);

    if (order) {
      const creditInfo = result.creditResult?.credits || {};
      const creditSummary = Object.entries(creditInfo)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${v} ${k.replace('_', ' ')}`)
        .join(', ');

      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, 'order_approved', 'Credits Added! 🎉', ?, '/dashboard/employer/orders-billing')
      `).run(( order.user_id || order.employer_id ), `Your payment for the ${order.package_name || 'credit'} package has been confirmed. Credits added: ${creditSummary || 'see your dashboard'}.`);

      // Send activation email
      sendEmail({
        to: order.email, toName: order.name, tags: ['billing'],
        subject: `Credits Added: ${order.package_name} 🎉`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#16a34a;padding:24px;text-align:center;">
            <h1 style="color:white;margin:0;">WantokJobs</h1>
          </div>
          <div style="padding:24px;">
            <h2>Your credits have been added!</h2>
            <p>Hi ${order.name},</p>
            <p>We've confirmed your payment for <strong>${order.package_name}</strong> (Invoice: ${order.invoice_number}).</p>
            <p><strong>Credits added:</strong></p>
            <ul>${creditSummary ? creditSummary.split(', ').map(c => `<li>${c} credits</li>`).join('') : '<li>See your dashboard</li>'}</ul>
            <p style="text-align:center;margin-top:24px;">
              <a href="${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/employer/orders-billing" style="background:#16a34a;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">View My Credits</a>
            </p>
          </div>
        </div>`,
      }).catch(() => {});
    }

    // Log activity
    try {
      db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, 'approve_order', 'order', orderId, JSON.stringify(result));
    } catch(e) {}

    res.json({ message: 'Payment approved and credits added', ...result });
  } catch (error) {
    logger.error('Error approving order', { error: error.message });
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// PUT /admin/:id/reject — Admin rejects order
router.put('/admin/:id/reject', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { reason } = req.body || {};
    const orderId = req.params.id;

    const result = rejectOrder(orderId, reason);
    if (!result.success) return res.status(400).json({ error: result.error });

    const order = db.prepare(`
      SELECT o.*, u.name, u.email, p.name as package_name
      FROM orders o JOIN users u ON COALESCE(o.user_id, o.employer_id) = u.id LEFT JOIN packages p ON o.package_id = p.id
      WHERE o.id = ?
    `).get(orderId);

    if (order) {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, 'order_rejected', 'Order Update', ?, '/dashboard/employer/orders-billing')
      `).run(( order.user_id || order.employer_id ), `Your order for ${order.package_name || 'credits'} (${order.invoice_number}) could not be processed. Reason: ${reason || 'Payment not received'}. Please contact support if you believe this is an error.`);
    }

    try {
      db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, 'reject_order', 'order', orderId, JSON.stringify({ reason }));
    } catch(e) {}

    res.json({ message: 'Order rejected', reason });
  } catch (error) {
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
      // Credit stats
      totalCreditsOutstanding: {
        job_posting: db.prepare('SELECT COALESCE(SUM(current_job_posting_credits), 0) as n FROM profiles_employer').get().n,
        ai_matching: db.prepare('SELECT COALESCE(SUM(current_ai_matching_credits), 0) as n FROM profiles_employer').get().n,
        candidate_search: db.prepare('SELECT COALESCE(SUM(current_candidate_search_credits), 0) as n FROM profiles_employer').get().n,
        alert: db.prepare('SELECT COALESCE(SUM(current_alert_credits), 0) as n FROM profiles_jobseeker').get().n,
      },
      premiumTrials: db.prepare('SELECT COUNT(*) as n FROM profiles_employer WHERE has_premium_indefinite_trial = 1').get().n
        + db.prepare('SELECT COUNT(*) as n FROM profiles_jobseeker WHERE has_premium_indefinite_trial = 1').get().n,
      activeTrials: db.prepare("SELECT COUNT(*) as n FROM profiles_employer WHERE standard_trial_end_date > datetime('now')").get().n
        + db.prepare("SELECT COUNT(*) as n FROM profiles_jobseeker WHERE standard_trial_end_date > datetime('now')").get().n,
      revenueByPackage: db.prepare(`
        SELECT p.name, COUNT(*) as orders, SUM(o.amount) as revenue
        FROM orders o JOIN packages p ON o.package_id = p.id
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
    logger.error('Revenue stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
