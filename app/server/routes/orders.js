const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const router = express.Router();
const { sendOrderConfirmationEmail } = require('../lib/email');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// POST / - Create order (employer only)
router.post('/', authenticateToken, requireRole('employer'), validate(schemas.order), (req, res) => {
  try {
    const { plan_id, payment_method, notes } = req.body;
    const employer_id = req.user.id;

    // Validate plan exists
    const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND active = 1').get(plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Generate invoice number
    const invoice_number = `INV-${Date.now()}-${employer_id}`;

    const result = db.prepare(`
      INSERT INTO orders (employer_id, plan_id, amount, currency, status, payment_method, invoice_number, notes)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(employer_id, plan_id, plan.price, plan.currency, payment_method, invoice_number, notes);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    sendOrderConfirmationEmail({ email: req.user.email, name: req.user.name }, order, plan).catch(() => {});
    res.status(201).json({ order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /my - Get employer's orders
router.get('/my', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const employer_id = req.user.id;
    
    const orders = db.prepare(`
      SELECT o.*, p.name as plan_name 
      FROM orders o
      INNER JOIN plans p ON o.plan_id = p.id
      WHERE o.employer_id = ?
      ORDER BY o.created_at DESC
    `).all(employer_id);
    
    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /:id - Get order detail
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const order = db.prepare(`
      SELECT o.*, p.name as plan_name, u.name as employer_name, u.email as employer_email
      FROM orders o
      INNER JOIN plans p ON o.plan_id = p.id
      INNER JOIN users u ON o.employer_id = u.id
      WHERE o.id = ?
    `).get(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Only owner or admin can view
    if (order.employer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// GET /admin/all - Admin get all orders
router.get('/admin/all', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT o.*, p.name as plan_name, u.name as employer_name, u.email as employer_email
      FROM orders o
      INNER JOIN plans p ON o.plan_id = p.id
      INNER JOIN users u ON o.employer_id = u.id
    `;
    
    const params = [];
    if (status) {
      query += ' WHERE o.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const orders = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM orders' + (status ? ' WHERE status = ?' : '')).get(...(status ? [status] : []));
    
    res.json({ orders, total: total.count });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;
