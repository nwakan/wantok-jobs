/**
 * Admin Pricing Configuration API Routes
 * 
 * Provides admin interface for dynamic pricing management.
 * All pricing changes take effect immediately without code deployment.
 * 
 * Phase 1: Dynamic Pricing System
 * Author: Agent Zero
 * Date: 2026-03-24
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/admin/pricing
 * List all pricing configurations (active and inactive)
 * Admin only
 */
router.get('/pricing', authenticateToken, requireRole, (req, res) => {
  try {
    const { feature_type, is_active } = req.query;
    
    let query = 'SELECT * FROM pricing_config WHERE 1=1';
    const params = [];
    
    if (feature_type) {
      query += ' AND feature_type = ?';
      params.push(feature_type);
    }
    
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY display_order ASC, feature_type ASC, tier_name ASC';
    
    const pricingConfigs = db.prepare(query).all(...params);
    
    // Parse metadata_json for each config
    pricingConfigs.forEach(config => {
      if (config.metadata_json) {
        try {
          config.metadata = JSON.parse(config.metadata_json);
        } catch (e) {
          config.metadata = {};
        }
      }
    });
    
    res.json({
      success: true,
      count: pricingConfigs.length,
      data: pricingConfigs
    });
  } catch (error) {
    console.error('Error fetching pricing configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing configurations'
    });
  }
});

/**
 * GET /api/admin/pricing/:id
 * Get single pricing configuration by ID
 * Admin only
 */
router.get('/pricing/:id', authenticateToken, requireRole, (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM pricing_config WHERE id = ?').get(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Pricing configuration not found'
      });
    }
    
    // Parse metadata_json
    if (config.metadata_json) {
      try {
        config.metadata = JSON.parse(config.metadata_json);
      } catch (e) {
        config.metadata = {};
      }
    }
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing configuration'
    });
  }
});

/**
 * POST /api/admin/pricing
 * Create new pricing configuration
 * Admin only
 */
router.post('/pricing', authenticateToken, requireRole, (req, res) => {
  try {
    const {
      feature_type,
      tier_name,
      price_pgk,
      price_usd,
      quantity,
      discount_percentage,
      description,
      display_order,
      metadata
    } = req.body;
    
    // Validation
    if (!feature_type || price_pgk === undefined) {
      return res.status(400).json({
        success: false,
        error: 'feature_type and price_pgk are required'
      });
    }
    
    // Check for duplicate
    const existing = db.prepare(
      'SELECT id FROM pricing_config WHERE feature_type = ? AND tier_name IS ?'
    ).get(feature_type, tier_name || null);
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Pricing configuration already exists for this feature and tier'
      });
    }
    
    // Convert metadata to JSON string
    const metadata_json = metadata ? JSON.stringify(metadata) : null;
    
    const stmt = db.prepare(`
      INSERT INTO pricing_config (
        feature_type, tier_name, price_pgk, price_usd, quantity,
        discount_percentage, description, display_order, metadata_json, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      feature_type,
      tier_name || null,
      price_pgk,
      price_usd || null,
      quantity || 1,
      discount_percentage || 0,
      description || null,
      display_order || 0,
      metadata_json,
      req.user.id
    );
    
    res.status(201).json({
      success: true,
      message: 'Pricing configuration created successfully',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error creating pricing config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create pricing configuration'
    });
  }
});

/**
 * PUT /api/admin/pricing/:id
 * Update existing pricing configuration
 * Admin only
 */
router.put('/pricing/:id', authenticateToken, requireRole, (req, res) => {
  try {
    const {
      price_pgk,
      price_usd,
      quantity,
      discount_percentage,
      description,
      is_active,
      display_order,
      metadata
    } = req.body;
    
    // Check if exists
    const existing = db.prepare('SELECT id FROM pricing_config WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Pricing configuration not found'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (price_pgk !== undefined) {
      updates.push('price_pgk = ?');
      params.push(price_pgk);
    }
    if (price_usd !== undefined) {
      updates.push('price_usd = ?');
      params.push(price_usd);
    }
    if (quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(quantity);
    }
    if (discount_percentage !== undefined) {
      updates.push('discount_percentage = ?');
      params.push(discount_percentage);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(display_order);
    }
    if (metadata !== undefined) {
      updates.push('metadata_json = ?');
      params.push(JSON.stringify(metadata));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updates.push('updated_at = datetime(\'now\')');
    params.push(req.params.id);
    
    const query = `UPDATE pricing_config SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);
    
    res.json({
      success: true,
      message: 'Pricing configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating pricing config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pricing configuration'
    });
  }
});

/**
 * DELETE /api/admin/pricing/:id
 * Deactivate pricing configuration (soft delete)
 * Admin only
 */
router.delete('/pricing/:id', authenticateToken, requireRole, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM pricing_config WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Pricing configuration not found'
      });
    }
    
    db.prepare('UPDATE pricing_config SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?')
      .run(req.params.id);
    
    res.json({
      success: true,
      message: 'Pricing configuration deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating pricing config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate pricing configuration'
    });
  }
});

/**
 * GET /api/pricing/public
 * Get active pricing for public display (checkout pages)
 * No authentication required
 */
router.get('/public', (req, res) => {
  try {
    const { feature_type } = req.query;
    
    let query = 'SELECT id, feature_type, tier_name, price_pgk, price_usd, quantity, discount_percentage, description, display_order FROM pricing_config WHERE is_active = 1';
    const params = [];
    
    if (feature_type) {
      query += ' AND feature_type = ?';
      params.push(feature_type);
    }
    
    query += ' ORDER BY display_order ASC, feature_type ASC, tier_name ASC';
    
    const pricing = db.prepare(query).all(...params);
    
    // Group by feature_type for easier frontend consumption
    const grouped = {};
    pricing.forEach(item => {
      if (!grouped[item.feature_type]) {
        grouped[item.feature_type] = [];
      }
      grouped[item.feature_type].push(item);
    });
    
    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Error fetching public pricing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing'
    });
  }
});

module.exports = router;
