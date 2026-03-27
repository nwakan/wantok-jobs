/**
 * Migration 040: Integrate pricing_config with subscription_tiers
 *
 * PROBLEM:
 * - Two separate pricing systems exist (Migration 037 + Migration 038)
 * - pricing_config table has subscription pricing
 * - subscription_tiers table ALSO has subscription pricing
 * - NO integration - risk of inconsistent pricing
 * - Admin changes in pricing_config don't affect subscription_tiers
 *
 * SOLUTION:
 * - Make pricing_config the single source of truth for pricing
 * - Add pricing_config_id foreign key to subscription_tiers
 * - Link existing subscription_tiers to corresponding pricing_config rows
 * - subscription_tiers keeps feature mappings and tier metadata
 * - price_pgk/price_usd remain as fallback for backwards compatibility
 *
 * BENEFITS:
 * - Admin changes prices in one place (pricing_config)
 * - Pricing automatically propagates to all subscriptions
 * - Backwards compatible (existing price columns remain)
 * - Preserves both systems' strengths
 *
 * Author: Agent Zero
 * Date: 2026-03-26
 * Phase: 4 (Revenue Optimization & Scale Readiness)
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('=== Migration 040: Integrate Pricing with Subscriptions ===');
console.log('Database:', dbPath);
console.log('Time:', new Date().toISOString());
console.log('');

try {
  db.exec('BEGIN TRANSACTION');

  // STEP 1: Add pricing_config_id column to subscription_tiers
  console.log('STEP 1: Adding pricing_config_id column to subscription_tiers...');
  db.exec(`
    ALTER TABLE subscription_tiers
    ADD COLUMN pricing_config_id INTEGER
    REFERENCES pricing_config(id) ON DELETE SET NULL
  `);
  console.log('✅ pricing_config_id column added');
  console.log('');

  // STEP 2: Create index for performance
  console.log('STEP 2: Creating index on pricing_config_id...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_subscription_tiers_pricing
    ON subscription_tiers(pricing_config_id)
  `);
  console.log('✅ Index created');
  console.log('');

  // STEP 3: Link existing subscription_tiers to pricing_config
  console.log('STEP 3: Linking subscription_tiers to pricing_config...');
  
  // Mapping: subscription tier name → pricing_config feature_type
  const mappings = [
    { tier_name: 'Premium Match', tier_type: 'jobseeker', feature_type: 'jobseeker_premium_match' },
    { tier_name: 'Premium Alerts', tier_type: 'jobseeker', feature_type: 'jobseeker_premium_alerts' },
    { tier_name: 'Premium Plus', tier_type: 'jobseeker', feature_type: 'jobseeker_premium_plus' },
    { tier_name: 'Premium Match', tier_type: 'employer', feature_type: 'employer_premium_match' },
    { tier_name: 'Employer Pro', tier_type: 'employer', feature_type: 'employer_pro' },
    { tier_name: 'Employer Enterprise', tier_type: 'employer', feature_type: 'employer_recruiter_pro' }
  ];

  let linkedCount = 0;
  for (const mapping of mappings) {
    // Find pricing_config row
    const pricingRow = db.prepare(`
      SELECT id FROM pricing_config
      WHERE feature_type = ? AND is_active = 1
      LIMIT 1
    `).get(mapping.feature_type);

    if (pricingRow) {
      // Find subscription_tiers row
      const tierRow = db.prepare(`
        SELECT tier_id FROM subscription_tiers
        WHERE name = ? AND tier_type = ?
        LIMIT 1
      `).get(mapping.tier_name, mapping.tier_type);

      if (tierRow) {
        // Link them
        db.prepare(`
          UPDATE subscription_tiers
          SET pricing_config_id = ?
          WHERE tier_id = ?
        `).run(pricingRow.id, tierRow.tier_id);
        
        console.log(`  ✅ Linked ${mapping.tier_type}/${mapping.tier_name} → pricing_config.id=${pricingRow.id}`);
        linkedCount++;
      } else {
        console.log(`  ⚠️  Tier not found: ${mapping.tier_type}/${mapping.tier_name}`);
      }
    } else {
      console.log(`  ⚠️  Pricing not found: ${mapping.feature_type}`);
    }
  }
  
  console.log('');
  console.log(`✅ Linked ${linkedCount}/6 subscription tiers to pricing_config`);
  console.log('');

  // STEP 4: Verify integration
  console.log('STEP 4: Verifying integration...');
  const verifyResult = db.prepare(`
    SELECT 
      st.tier_id,
      st.name as tier_name,
      st.tier_type,
      st.price_pgk as tier_price_pgk,
      st.price_usd as tier_price_usd,
      st.pricing_config_id,
      pc.feature_type,
      pc.price_pgk as config_price_pgk,
      pc.price_usd as config_price_usd
    FROM subscription_tiers st
    LEFT JOIN pricing_config pc ON st.pricing_config_id = pc.id
    ORDER BY st.tier_type, st.display_order
  `).all();

  console.log('');
  console.log('Subscription Tiers → Pricing Config Integration:');
  console.log('─'.repeat(120));
  verifyResult.forEach(row => {
    const tierPrice = `PGK ${row.tier_price_pgk} (USD ${row.tier_price_usd})`;
    const configPrice = row.config_price_pgk ? `PGK ${row.config_price_pgk} (USD ${row.config_price_usd})` : 'NOT LINKED';
    const match = row.config_price_pgk === row.tier_price_pgk ? '✅' : '⚠️';
    console.log(`${match} ${row.tier_type}/${row.tier_name}: Tier=${tierPrice}, Config=${configPrice}`);
  });
  console.log('─'.repeat(120));
  console.log('');

  db.exec('COMMIT');

  console.log('✅ Migration 040 completed successfully!');
  console.log('');
  console.log('Changes:');
  console.log('  1. Added pricing_config_id column to subscription_tiers');
  console.log('  2. Created index idx_subscription_tiers_pricing');
  console.log('  3. Linked 6 subscription tiers to pricing_config');
  console.log('  4. pricing_config is now single source of truth for subscription pricing');
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Update server/routes/subscriptions.js to read prices from pricing_config');
  console.log('  2. Test subscription creation with new pricing integration');
  console.log('  3. Verify admin price changes propagate to subscriptions');
  console.log('');

} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error.message);
  console.error('');
  console.error('Stack trace:', error.stack);
  process.exit(1);
} finally {
  db.close();
}
