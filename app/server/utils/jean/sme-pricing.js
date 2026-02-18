/**
 * SME Pricing Engine for WhatsApp Employers
 * Credit-based micro-pricing for job posts
 */

const PACKAGES = {
  free_trial: {
    key: 'free_trial',
    name: 'First Job Free',
    price: 0,
    credits: 1,
    duration_days: 7,
    one_time: true,
    description: '🎉 Try it out! Your first job post is FREE for 7 days.',
  },
  single: {
    key: 'single',
    name: 'Single Post',
    price: 50,
    credits: 1,
    duration_days: 14,
    description: '📋 One job, 14 days active — perfect for a quick hire.',
  },
  starter_3: {
    key: 'starter_3',
    name: 'Starter Pack',
    price: 120,
    credits: 3,
    duration_days: 30,
    description: '📦 3 job posts, 30 days — best for small businesses. Save K30!',
  },
  starter_5: {
    key: 'starter_5',
    name: 'Business Pack',
    price: 180,
    credits: 5,
    duration_days: 30,
    description: '🚀 5 job posts, 30 days — growing fast? This is for you. Save K70!',
  },
  monthly: {
    key: 'monthly',
    name: 'Monthly Plan',
    price: 350,
    credits: 10,
    duration_days: 30,
    description: '💼 10 job posts, 30 days — for serious hiring. Save K150!',
  },
};

const PAYMENT_DETAILS = {
  bsp: {
    bank: 'BSP',
    account_number: '1234567890',
    account_name: 'WantokJobs Ltd',
  },
  mibank: {
    bank: 'MiBank',
    account_number: '0987654321',
    account_name: 'WantokJobs Ltd',
  },
};

/**
 * Check if user has used their free trial
 */
function canPostFree(db, userId) {
  try {
    const used = db.prepare(`
      SELECT COUNT(*) as count FROM credit_transactions 
      WHERE user_id = ? AND credit_type = 'job_post' AND reason LIKE '%free trial%'
    `).get(userId);
    return used.count === 0;
  } catch (e) {
    return false;
  }
}

/**
 * Get user's credit balance
 */
function getBalance(db, userId) {
  try {
    let wallet = db.prepare('SELECT * FROM credit_wallets WHERE user_id = ?').get(userId);
    if (!wallet) {
      // Create wallet
      db.prepare('INSERT INTO credit_wallets (user_id, balance, reserved_balance) VALUES (?, 0, 0)').run(userId);
      wallet = db.prepare('SELECT * FROM credit_wallets WHERE user_id = ?').get(userId);
    }
    return {
      balance: wallet.balance || 0,
      reserved: wallet.reserved_balance || 0,
      available: (wallet.balance || 0) - (wallet.reserved_balance || 0),
    };
  } catch (e) {
    return { balance: 0, reserved: 0, available: 0 };
  }
}

/**
 * Deduct 1 credit for job posting
 */
function deductCredit(db, userId, jobId, reason = 'Job post via WhatsApp') {
  try {
    const wallet = db.prepare('SELECT balance FROM credit_wallets WHERE user_id = ?').get(userId);
    if (!wallet || wallet.balance < 1) {
      return { error: 'insufficient_credits', balance: wallet?.balance || 0 };
    }

    const newBalance = wallet.balance - 1;
    db.prepare('UPDATE credit_wallets SET balance = ? WHERE user_id = ?').run(newBalance, userId);

    db.prepare(`
      INSERT INTO credit_transactions (user_id, amount, credit_type, balance_after, reason, metadata, created_at)
      VALUES (?, -1, 'job_post', ?, ?, ?, datetime('now'))
    `).run(userId, newBalance, reason, JSON.stringify({ job_id: jobId }));

    return { success: true, balance_after: newBalance };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Add credits after payment verification
 */
function addCredits(db, userId, packageKey, paymentRef) {
  const pkg = PACKAGES[packageKey];
  if (!pkg) return { error: 'invalid_package' };

  try {
    const wallet = db.prepare('SELECT balance FROM credit_wallets WHERE user_id = ?').get(userId);
    const currentBalance = wallet?.balance || 0;
    const newBalance = currentBalance + pkg.credits;

    if (wallet) {
      db.prepare('UPDATE credit_wallets SET balance = ? WHERE user_id = ?').run(newBalance, userId);
    } else {
      db.prepare('INSERT INTO credit_wallets (user_id, balance, reserved_balance) VALUES (?, ?, 0)').run(userId, newBalance);
    }

    db.prepare(`
      INSERT INTO credit_transactions (user_id, amount, credit_type, balance_after, reason, metadata, created_at)
      VALUES (?, ?, 'job_post', ?, ?, ?, datetime('now'))
    `).run(
      userId,
      pkg.credits,
      newBalance,
      `${pkg.name} purchase`,
      JSON.stringify({ package: packageKey, payment_ref: paymentRef })
    );

    return { success: true, credits_added: pkg.credits, balance_after: newBalance };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Smart package recommendation based on posting history
 */
function getPackageRecommendation(db, userId) {
  try {
    const postCount = db.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE employer_id = ? AND created_at >= datetime('now', '-30 days')
    `).get(userId);

    const activeCount = db.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE employer_id = ? AND status = 'active'
    `).get(userId);

    const count = postCount.count || 0;
    const active = activeCount.count || 0;

    // First time user
    if (count === 0) {
      return {
        recommended: 'free_trial',
        reason: 'Perfect for trying it out! Your first post is FREE. 🎉',
      };
    }

    // Light user
    if (count <= 2) {
      return {
        recommended: 'single',
        reason: 'You post occasionally — single posts work great for you!',
      };
    }

    // Regular user
    if (count <= 5) {
      return {
        recommended: 'starter_3',
        reason: 'You post regularly — save K30 with the Starter Pack!',
      };
    }

    // Heavy user
    if (count <= 8) {
      return {
        recommended: 'starter_5',
        reason: 'You\'re growing! Business Pack saves you K70.',
      };
    }

    // Very active
    return {
      recommended: 'monthly',
      reason: 'You post a lot! Monthly Plan saves K150 and keeps you covered.',
    };
  } catch (e) {
    return { recommended: 'single', reason: 'Start simple!' };
  }
}

/**
 * Format pricing message for WhatsApp
 */
function formatPricingMessage(db, userId) {
  const balance = getBalance(db, userId);
  const canUseFree = canPostFree(db, userId);
  const rec = getPackageRecommendation(db, userId);

  let msg = '💰 **WantokJobs SME Pricing**\n\n';
  
  if (balance.available > 0) {
    msg += `✅ You have **${balance.available} credit${balance.available > 1 ? 's' : ''}** available!\n\n`;
  }

  if (canUseFree) {
    msg += '🎉 **FREE TRIAL** — Your first job post is FREE for 7 days!\n\n';
  }

  msg += '**Pay-As-You-Go:**\n';
  msg += '• K50 — 1 job, 14 days\n\n';

  msg += '**Packages (Save more!):**\n';
  msg += '• **K120** — 3 jobs, 30 days (save K30)\n';
  msg += '• **K180** — 5 jobs, 30 days (save K70)\n';
  msg += '• **K350** — 10 jobs, 30 days (save K150)\n\n';

  if (rec.recommended !== 'free_trial') {
    const recPkg = PACKAGES[rec.recommended];
    msg += `💡 **Recommended for you:** ${recPkg.name} — ${rec.reason}\n\n`;
  }

  msg += 'All prices in Kina (PGK). Jobs stay active for the full duration!\n';
  msg += 'Tell me which package you want, or say "free trial" to start. 😊';

  return msg;
}

/**
 * Get payment instructions with unique reference code
 */
function getPaymentInstructions(db, userId, packageKey) {
  const pkg = PACKAGES[packageKey];
  if (!pkg) return null;

  // Generate unique payment reference
  const ref = `WJ${userId}${Date.now().toString(36).toUpperCase()}`;

  let msg = `📱 **Payment for ${pkg.name}**\n\n`;
  msg += `💰 Amount: **K${pkg.price}**\n`;
  msg += `📦 You'll get: ${pkg.credits} job post${pkg.credits > 1 ? 's' : ''}, ${pkg.duration_days} days active\n\n`;

  msg += '**Bank Transfer Details:**\n\n';
  msg += `**BSP:**\n`;
  msg += `Account: ${PAYMENT_DETAILS.bsp.account_number}\n`;
  msg += `Name: ${PAYMENT_DETAILS.bsp.account_name}\n\n`;

  msg += `**MiBank:**\n`;
  msg += `Account: ${PAYMENT_DETAILS.mibank.account_number}\n`;
  msg += `Name: ${PAYMENT_DETAILS.mibank.account_name}\n\n`;

  msg += `🔢 **Reference Code:** ${ref}\n`;
  msg += `⚠️ **Important:** Include "${ref}" in your payment reference!\n\n`;

  msg += `After you transfer:\n`;
  msg += `1. Send me a screenshot of the receipt, OR\n`;
  msg += `2. Say "I've paid ${ref}"\n\n`;

  msg += `Mi bai checkim na putim credit bilong yu! Usually approved within 2-24 hours. 😊`;

  return { message: msg, reference_code: ref, amount: pkg.price };
}

module.exports = {
  PACKAGES,
  PAYMENT_DETAILS,
  canPostFree,
  getBalance,
  deductCredit,
  addCredits,
  getPackageRecommendation,
  formatPricingMessage,
  getPaymentInstructions,
};
