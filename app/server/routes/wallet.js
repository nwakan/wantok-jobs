const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database');
const billing = require('../lib/billing');

// ─── User Routes (authenticated) ───────────────────────────────────

// GET /api/wallet — wallet balance + recent transactions
router.get('/', authenticateToken, (req, res) => {
  try {
    const wallet = billing.getOrCreateWallet(req.user.id);
    const transactions = billing.getCreditTransactions(req.user.id, 10, 0);
    res.json({ wallet, transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/transactions — paginated transaction history
router.get('/transactions', authenticateToken, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const transactions = billing.getCreditTransactions(req.user.id, limit, offset);
    const total = db.prepare('SELECT COUNT(*) as n FROM credit_transactions WHERE user_id = ?').get(req.user.id).n;
    res.json({ transactions, total, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/deposit — create deposit intent
router.post('/deposit', authenticateToken, (req, res) => {
  try {
    const { amount, packageId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const result = billing.createDepositIntent(req.user.id, amount, packageId);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/refund/:transactionId — request refund
router.post('/refund/:transactionId', authenticateToken, (req, res) => {
  try {
    const txId = parseInt(req.params.transactionId);
    if (!txId) return res.status(400).json({ error: 'Invalid transaction ID' });

    const result = billing.requestRefund(req.user.id, txId);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/refunds — list user's refunds
router.get('/refunds', authenticateToken, (req, res) => {
  try {
    const refunds = db.prepare('SELECT * FROM credit_refunds WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ refunds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin Routes ───────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET /api/wallet/admin/deposits — list pending deposit intents
router.get('/admin/deposits', authenticateToken, requireAdmin, (req, res) => {
  try {
    const status = req.query.status || 'awaiting_payment';
    const deposits = db.prepare(`
      SELECT di.*, u.name as user_name, u.email as user_email
      FROM deposit_intents di
      JOIN users u ON u.id = di.user_id
      WHERE di.status = ?
      ORDER BY di.created_at DESC
    `).all(status);
    res.json({ deposits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/admin/deposits/:id/match — match a deposit
router.post('/admin/deposits/:id/match', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = billing.matchDeposit(parseInt(req.params.id), req.user.id);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/admin/refunds — list pending refunds
router.get('/admin/refunds', authenticateToken, requireAdmin, (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const refunds = db.prepare(`
      SELECT cr.*, u.name as user_name, u.email as user_email,
             ct.credit_type, ct.amount as original_amount, ct.created_at as original_tx_date
      FROM credit_refunds cr
      JOIN users u ON u.id = cr.user_id
      JOIN credit_transactions ct ON ct.id = cr.original_transaction_id
      WHERE cr.status = ?
      ORDER BY cr.created_at DESC
    `).all(status);
    res.json({ refunds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/admin/refunds/:id/approve — approve refund
router.post('/admin/refunds/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = billing.processRefund(parseInt(req.params.id), req.user.id);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/admin/refunds/:id/reject — reject refund
router.post('/admin/refunds/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = billing.rejectRefund(parseInt(req.params.id), req.user.id, req.body.reason);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/admin/stats — credit system overview
router.get('/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const totalWallets = db.prepare('SELECT COUNT(*) as n FROM credit_wallets').get().n;
    const totalBalance = db.prepare('SELECT COALESCE(SUM(balance), 0) as n FROM credit_wallets').get().n;
    const totalReserved = db.prepare('SELECT COALESCE(SUM(reserved_balance), 0) as n FROM credit_wallets').get().n;
    const pendingDeposits = db.prepare("SELECT COUNT(*) as n FROM deposit_intents WHERE status = 'awaiting_payment'").get().n;
    const pendingRefunds = db.prepare("SELECT COUNT(*) as n FROM credit_refunds WHERE status = 'pending'").get().n;
    const suspendedWallets = db.prepare("SELECT COUNT(*) as n FROM credit_wallets WHERE status = 'suspended'").get().n;

    res.json({
      totalWallets,
      totalBalance,
      totalReserved,
      pendingDeposits,
      pendingRefunds,
      suspendedWallets,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
