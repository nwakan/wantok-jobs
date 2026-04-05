/**
 * Admin WhatsApp Configuration API Routes
 * 
 * Provides admin interface for managing dual WhatsApp integration:
 * - Get/update configuration
 * - Switch between Web.js and API integrations
 * - Manage Web.js connection (QR code, connect/disconnect)
 * - View status and statistics
 * - Access integration history
 * 
 * Created: 2026-04-05
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const logger = require('../utils/logger');
const whatsappRouter = require('../lib/whatsapp-service-router');
const webService = require('../services/whatsapp-web-service');

// Admin authentication middleware
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(requireAdmin);

/**
 * GET /api/admin/whatsapp/config
 * Get current WhatsApp integration configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = whatsappRouter.getIntegrationConfig();
    
    // Get all configuration values
    const allConfig = db.prepare('SELECT key, value FROM whatsapp_config').all();
    const configMap = {};
    allConfig.forEach(row => {
      configMap[row.key] = row.value;
    });
    
    res.json({
      success: true,
      config: {
        integrationType: config.type,
        webEnabled: config.webEnabled,
        apiEnabled: config.apiEnabled,
        ...configMap
      }
    });
  } catch (e) {
    logger.error('Failed to get WhatsApp config', { error: e.message });
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

/**
 * POST /api/admin/whatsapp/config
 * Update WhatsApp integration configuration
 * Body: { integrationType: 'web' | 'api', ...configUpdates }
 */
router.post('/config', async (req, res) => {
  try {
    const { integrationType, ...configUpdates } = req.body;
    
    if (!integrationType || !['web', 'api'].includes(integrationType)) {
      return res.status(400).json({ error: 'Invalid integration type' });
    }
    
    // Switch integration type
    let result;
    if (integrationType === 'web') {
      result = await whatsappRouter.switchToWebIntegration(req.user.id);
    } else {
      result = await whatsappRouter.switchToAPIIntegration(req.user.id);
    }
    
    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }
    
    // Update additional configuration values
    const updateStmt = db.prepare('UPDATE whatsapp_config SET value=? WHERE key=?');
    for (const [key, value] of Object.entries(configUpdates)) {
      if (key !== 'integrationType') {
        try {
          updateStmt.run(value, key);
        } catch (e) {
          logger.error('Failed to update config key', { key, error: e.message });
        }
      }
    }
    
    res.json({
      success: true,
      message: `Switched to ${integrationType} integration`,
      integrationType
    });
  } catch (e) {
    logger.error('Failed to update WhatsApp config', { error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * GET /api/admin/whatsapp/status
 * Get status of both integrations with statistics
 */
router.get('/status', (req, res) => {
  try {
    const status = whatsappRouter.getIntegrationStatus();
    res.json({
      success: true,
      status
    });
  } catch (e) {
    logger.error('Failed to get WhatsApp status', { error: e.message });
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * POST /api/admin/whatsapp/web/connect
 * Initialize Web.js client and generate QR code
 */
router.post('/web/connect', async (req, res) => {
  try {
    const result = await webService.initWebClient();
    
    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }
    
    res.json({
      success: true,
      message: 'Web.js client initializing. QR code will be available shortly.'
    });
  } catch (e) {
    logger.error('Failed to initialize Web.js client', { error: e.message });
    res.status(500).json({ error: 'Failed to initialize client' });
  }
});

/**
 * POST /api/admin/whatsapp/web/disconnect
 * Disconnect Web.js client
 */
router.post('/web/disconnect', async (req, res) => {
  try {
    const result = await webService.disconnectWebClient();
    
    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }
    
    res.json({
      success: true,
      message: 'Web.js client disconnected successfully'
    });
  } catch (e) {
    logger.error('Failed to disconnect Web.js client', { error: e.message });
    res.status(500).json({ error: 'Failed to disconnect client' });
  }
});

/**
 * GET /api/admin/whatsapp/web/qr
 * Get current QR code for scanning (base64 data URL)
 */
router.get('/web/qr', (req, res) => {
  try {
    const qrCode = webService.getQRCode();
    
    if (!qrCode) {
      return res.status(404).json({ error: 'No QR code available. Client may not be initializing.' });
    }
    
    res.json({
      success: true,
      qrCode
    });
  } catch (e) {
    logger.error('Failed to get QR code', { error: e.message });
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

/**
 * GET /api/admin/whatsapp/web/status
 * Get Web.js connection status
 */
router.get('/web/status', (req, res) => {
  try {
    const status = webService.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (e) {
    logger.error('Failed to get Web.js status', { error: e.message });
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * GET /api/admin/whatsapp/web/stats
 * Get Web.js message statistics
 */
router.get('/web/stats', (req, res) => {
  try {
    const stats = webService.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (e) {
    logger.error('Failed to get Web.js stats', { error: e.message });
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * GET /api/admin/whatsapp/history
 * Get integration event history
 * Query params: limit (default 50)
 */
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = whatsappRouter.getIntegrationHistory(limit);
    
    res.json({
      success: true,
      history
    });
  } catch (e) {
    logger.error('Failed to get integration history', { error: e.message });
    res.status(500).json({ error: 'Failed to get history' });
  }
});

/**
 * GET /api/admin/whatsapp/health
 * Health check for active integration
 */
router.get('/health', async (req, res) => {
  try {
    const health = await whatsappRouter.healthCheck();
    
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json({
      success: health.healthy,
      ...health
    });
  } catch (e) {
    logger.error('Failed to check WhatsApp health', { error: e.message });
    res.status(500).json({ error: 'Failed to check health' });
  }
});

/**
 * POST /api/admin/whatsapp/test-message
 * Send test message via active integration
 * Body: { phone, message }
 */
router.post('/test-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone number and message required' });
    }
    
    const result = await whatsappRouter.sendMessage(phone, message);
    
    res.json({
      success: true,
      message: 'Test message sent successfully',
      result
    });
  } catch (e) {
    logger.error('Failed to send test message', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
