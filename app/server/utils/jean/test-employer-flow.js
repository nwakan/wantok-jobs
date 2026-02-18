/**
 * Test script for WhatsApp Employer Flow
 * Tests the full employer journey: greeting → post job → pricing → payment
 */

const db = require('../../database');
const Jean = require('./index');
const pricing = require('./sme-pricing');
const waHandler = require('./whatsapp-employer');

const RESET_COLOR = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

function log(message, color = RESET_COLOR) {
  console.log(`${color}${message}${RESET_COLOR}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, CYAN);
  log(`  ${title}`, CYAN);
  log('='.repeat(60), CYAN);
}

function pass(message) {
  log(`✅ ${message}`, GREEN);
}

function fail(message) {
  log(`❌ ${message}`, RED);
  process.exit(1);
}

function info(message) {
  log(`ℹ️  ${message}`, BLUE);
}

async function runTests() {
  log('\n🧪 WhatsApp Employer Flow Test Suite', YELLOW);
  log('Testing Jean\'s SME job posting and pricing system\n', YELLOW);

  const jean = new Jean();
  const testPhone = '+675 7123 4567';
  let testUserId = null;
  let testJobId = null;

  // ─── Test 1: Greeting new employer ───────────────────────
  section('Test 1: Greeting New Employer');
  
  try {
    const greeting = waHandler.handleEmployerGreeting(db, testPhone, null);
    
    if (greeting.is_new) {
      pass('New employer detected correctly');
      info(`Message: ${greeting.message.substring(0, 100)}...`);
    } else {
      fail('Should detect as new employer');
    }
  } catch (e) {
    fail(`Greeting test failed: ${e.message}`);
  }

  // ─── Test 2: Create quick employer account ───────────────
  section('Test 2: Create Quick Employer Account');

  try {
    const result = waHandler.createQuickEmployer(db, testPhone, 'Test Company Ltd', 'Lae, Morobe');
    
    if (result.success && result.user_id) {
      testUserId = result.user_id;
      pass(`Employer account created with ID: ${testUserId}`);
      
      // Verify account exists
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(testUserId);
      const profile = db.prepare('SELECT * FROM profiles_employer WHERE user_id = ?').get(testUserId);
      const wallet = db.prepare('SELECT * FROM credit_wallets WHERE user_id = ?').get(testUserId);
      
      if (user && profile && wallet) {
        pass('User, profile, and wallet created successfully');
        info(`Company: ${profile.company_name}`);
        info(`Balance: ${wallet.balance} credits`);
      } else {
        fail('Missing user data');
      }
    } else {
      fail(`Account creation failed: ${result.error}`);
    }
  } catch (e) {
    fail(`Account creation test failed: ${e.message}`);
  }

  // ─── Test 3: Parse job from natural language ─────────────
  section('Test 3: Parse Job from Natural Language');

  const jobMessages = [
    'I need a driver in Lae, K800 per fortnight',
    'Looking for a mechanic in Port Moresby',
    'Hiring accountant at our Kokopo office, K3000-4000 monthly',
  ];

  for (const msg of jobMessages) {
    try {
      info(`Testing: "${msg}"`);
      const parsed = await waHandler.parseJobFromMessage(msg);
      
      if (parsed.title) {
        pass(`Parsed title: ${parsed.title}`);
        if (parsed.location) info(`Location: ${parsed.location}`);
        if (parsed.salary_min) info(`Salary: K${parsed.salary_min}${parsed.salary_max ? `-${parsed.salary_max}` : ''}`);
        info(`Method: ${parsed.method}, Confidence: ${parsed.confidence}`);
      } else {
        fail('Failed to parse job title');
      }
    } catch (e) {
      fail(`Parse test failed: ${e.message}`);
    }
  }

  // ─── Test 4: Check free trial eligibility ────────────────
  section('Test 4: Check Free Trial Eligibility');

  try {
    const canUseFree = pricing.canPostFree(db, testUserId);
    if (canUseFree) {
      pass('User is eligible for free trial');
    } else {
      fail('User should be eligible for free trial');
    }
  } catch (e) {
    fail(`Free trial check failed: ${e.message}`);
  }

  // ─── Test 5: Pricing display ─────────────────────────────
  section('Test 5: Pricing Display');

  try {
    const pricingMsg = pricing.formatPricingMessage(db, testUserId);
    if (pricingMsg.includes('K50') && pricingMsg.includes('FREE TRIAL')) {
      pass('Pricing message formatted correctly');
      info('Sample pricing message:');
      console.log(pricingMsg.split('\n').slice(0, 10).join('\n'));
    } else {
      fail('Pricing message missing key information');
    }
  } catch (e) {
    fail(`Pricing display test failed: ${e.message}`);
  }

  // ─── Test 6: Post job using free trial ───────────────────
  section('Test 6: Post Job (Free Trial)');

  try {
    // Add 1 credit for free trial
    db.prepare('UPDATE credit_wallets SET balance = 1 WHERE user_id = ?').run(testUserId);
    
    const jobData = {
      title: 'Test Driver Position',
      description: 'We need a reliable driver for our Lae operations.',
      location: 'Lae, Morobe',
      salary_min: 800,
      job_type: 'full-time',
      status: 'active',
    };

    const actions = require('./actions');
    const postResult = actions.postJob(db, testUserId, jobData);
    
    if (postResult.success && postResult.jobId) {
      testJobId = postResult.jobId;
      pass(`Job posted successfully with ID: ${testJobId}`);
      
      // Deduct credit
      const deductResult = pricing.deductCredit(db, testUserId, testJobId, 'Free trial - test job');
      if (deductResult.success) {
        pass('Credit deducted successfully');
        info(`Balance after: ${deductResult.balance_after}`);
      } else {
        fail(`Credit deduction failed: ${deductResult.error}`);
      }
    } else {
      fail('Job posting failed');
    }
  } catch (e) {
    fail(`Job posting test failed: ${e.message}`);
  }

  // ─── Test 7: Get location stats ──────────────────────────
  section('Test 7: Location Stats for Sales Pitch');

  try {
    const stats = waHandler.getLocationStats(db, 'Lae');
    pass('Location stats retrieved');
    info(`Jobseekers in Lae: ${stats.jobseekers}`);
    info(`Active jobs in Lae: ${stats.active_jobs}`);
    info(`Alert subscribers: ${stats.matching_alerts || 0}`);
  } catch (e) {
    fail(`Location stats test failed: ${e.message}`);
  }

  // ─── Test 8: Package recommendation ───────────────────────
  section('Test 8: Smart Package Recommendation');

  try {
    const rec = pricing.getPackageRecommendation(db, testUserId);
    pass(`Recommendation: ${rec.recommended}`);
    info(`Reason: ${rec.reason}`);
    
    const pkg = pricing.PACKAGES[rec.recommended];
    if (pkg) {
      info(`Package: ${pkg.name} - K${pkg.price} for ${pkg.credits} credit${pkg.credits > 1 ? 's' : ''}`);
    }
  } catch (e) {
    fail(`Package recommendation test failed: ${e.message}`);
  }

  // ─── Test 9: Payment instructions ─────────────────────────
  section('Test 9: Payment Instructions Generation');

  try {
    const paymentInfo = pricing.getPaymentInstructions(db, testUserId, 'single');
    if (paymentInfo && paymentInfo.reference_code) {
      pass(`Payment reference generated: ${paymentInfo.reference_code}`);
      info(`Amount: K${paymentInfo.amount}`);
      info('Payment message sample:');
      console.log(paymentInfo.message.split('\n').slice(0, 12).join('\n'));
    } else {
      fail('Failed to generate payment instructions');
    }
  } catch (e) {
    fail(`Payment instructions test failed: ${e.message}`);
  }

  // ─── Test 10: Add credits after "payment" ────────────────
  section('Test 10: Add Credits After Payment');

  try {
    const addResult = pricing.addCredits(db, testUserId, 'starter_3', 'TEST_PAYMENT_REF');
    if (addResult.success) {
      pass(`Credits added: ${addResult.credits_added}`);
      info(`New balance: ${addResult.balance_after}`);
      
      // Verify balance
      const balance = pricing.getBalance(db, testUserId);
      if (balance.balance === addResult.balance_after) {
        pass('Balance verified correctly');
      } else {
        fail('Balance mismatch');
      }
    } else {
      fail(`Credit addition failed: ${addResult.error}`);
    }
  } catch (e) {
    fail(`Credit addition test failed: ${e.message}`);
  }

  // ─── Test 11: Upsell message generation ──────────────────
  section('Test 11: Upsell Message Generation');

  try {
    const actions = require('./actions');
    const upsellMsg = actions.generateUpsellMessage(db, testUserId);
    pass('Upsell message generated');
    info(`Message: ${upsellMsg}`);
  } catch (e) {
    fail(`Upsell message test failed: ${e.message}`);
  }

  // ─── Cleanup ──────────────────────────────────────────────
  section('Cleanup');

  try {
    if (testJobId) {
      db.prepare('DELETE FROM jobs WHERE id = ?').run(testJobId);
      info(`Deleted test job ${testJobId}`);
    }
    if (testUserId) {
      db.prepare('DELETE FROM credit_transactions WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM credit_wallets WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM whatsapp_employers WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM profiles_employer WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
      info(`Deleted test user ${testUserId}`);
    }
    pass('Cleanup complete');
  } catch (e) {
    log(`⚠️  Cleanup warning: ${e.message}`, YELLOW);
  }

  // ─── Summary ──────────────────────────────────────────────
  log('\n' + '='.repeat(60), GREEN);
  log('  🎉 All tests passed!', GREEN);
  log('='.repeat(60) + '\n', GREEN);

  log('✅ WhatsApp Employer Flow is ready for production!', GREEN);
  log('✅ SME pricing engine working correctly', GREEN);
  log('✅ Natural language job parsing functional', GREEN);
  log('✅ Credit system operational', GREEN);
  log('✅ Location stats for sales pitches ready', GREEN);
  log('✅ Payment flow implemented\n', GREEN);

  process.exit(0);
}

// Run tests
runTests().catch((error) => {
  fail(`\nTest suite crashed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
