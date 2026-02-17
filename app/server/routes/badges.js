const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All badge definitions
const BADGE_DEFINITIONS = [
  { type: 'profile_complete', name: 'Profile Complete', description: 'Profile completeness reached 80%', icon: '🎯' },
  { type: 'first_application', name: 'First Application', description: 'Submitted your first job application', icon: '📝' },
  { type: 'active_seeker', name: 'Active Seeker', description: 'Applied to 10+ jobs', icon: '🔥' },
  { type: 'top_applicant', name: 'Top Applicant', description: 'Applied to 25+ jobs', icon: '⭐' },
  { type: 'resume_ready', name: 'Resume Ready', description: 'Uploaded or built a resume', icon: '📄' },
  { type: 'alert_setter', name: 'Alert Setter', description: 'Set up job alerts', icon: '🔔' },
  { type: 'networker', name: 'Networker', description: 'Followed 5+ companies', icon: '👥' },
  { type: 'learner', name: 'Learner', description: 'Enrolled in a training course', icon: '🎓' },
  { type: 'communicator', name: 'Communicator', description: 'Sent your first message', icon: '💬' },
  { type: 'early_adopter', name: 'Early Adopter', description: 'One of the first 1000 users', icon: '🏆' },
];

// Award a badge (idempotent)
function awardBadge(userId, badgeDef) {
  try {
    db.prepare(
      `INSERT OR IGNORE INTO badges (user_id, badge_type, badge_name, description, icon) VALUES (?, ?, ?, ?, ?)`
    ).run(userId, badgeDef.type, badgeDef.name, badgeDef.description, badgeDef.icon);
    // Return true if inserted
    return db.prepare(`SELECT changes() as c`).get().c > 0;
  } catch (e) {
    // Table might not exist yet
    return false;
  }
}

// Check all criteria and award badges, return newly earned ones
function checkAndAwardBadges(userId) {
  const newBadges = [];
  const earned = new Set();
  try {
    const existing = db.prepare(`SELECT badge_type FROM badges WHERE user_id = ?`).all(userId);
    existing.forEach(b => earned.add(b.badge_type));
  } catch {
    return newBadges;
  }

  // Helper
  const tryAward = (type, checkFn) => {
    if (earned.has(type)) return;
    try {
      if (checkFn()) {
        const def = BADGE_DEFINITIONS.find(d => d.type === type);
        if (def && awardBadge(userId, def)) newBadges.push(def);
      }
    } catch (e) {
      logger.debug(`Badge check ${type} failed: ${e.message}`);
    }
  };

  // 1. Profile Complete (>=80%)
  tryAward('profile_complete', () => {
    const p = db.prepare(`SELECT * FROM profiles WHERE user_id = ?`).get(userId);
    if (!p) return false;
    let filled = 0, total = 0;
    const fields = ['full_name', 'phone', 'location', 'bio', 'skills', 'experience', 'education', 'province', 'desired_salary', 'job_title'];
    for (const f of fields) {
      total++;
      if (p[f] && String(p[f]).trim()) filled++;
    }
    return total > 0 && (filled / total) >= 0.8;
  });

  // 2. First Application
  tryAward('first_application', () => {
    const r = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE user_id = ?`).get(userId);
    return r.c >= 1;
  });

  // 3. Active Seeker (10+)
  tryAward('active_seeker', () => {
    const r = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE user_id = ?`).get(userId);
    return r.c >= 10;
  });

  // 4. Top Applicant (25+)
  tryAward('top_applicant', () => {
    const r = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE user_id = ?`).get(userId);
    return r.c >= 25;
  });

  // 5. Resume Ready
  tryAward('resume_ready', () => {
    // Check profiles for resume_url or resume_data
    const p = db.prepare(`SELECT resume_url FROM profiles WHERE user_id = ?`).get(userId);
    if (p && p.resume_url) return true;
    // Check resumes table if exists
    try {
      const r = db.prepare(`SELECT COUNT(*) as c FROM resumes WHERE user_id = ?`).get(userId);
      return r.c >= 1;
    } catch { return false; }
  });

  // 6. Alert Setter
  tryAward('alert_setter', () => {
    const r = db.prepare(`SELECT COUNT(*) as c FROM job_alerts WHERE user_id = ?`).get(userId);
    return r.c >= 1;
  });

  // 7. Networker (5+ follows)
  tryAward('networker', () => {
    const r = db.prepare(`SELECT COUNT(*) as c FROM company_follows WHERE user_id = ?`).get(userId);
    return r.c >= 5;
  });

  // 8. Learner
  tryAward('learner', () => {
    try {
      const r = db.prepare(`SELECT COUNT(*) as c FROM training_enrollments WHERE user_id = ?`).get(userId);
      return r.c >= 1;
    } catch { return false; }
  });

  // 9. Communicator
  tryAward('communicator', () => {
    const r = db.prepare(`SELECT COUNT(*) as c FROM messages WHERE sender_id = ?`).get(userId);
    return r.c >= 1;
  });

  // 10. Early Adopter
  tryAward('early_adopter', () => {
    const r = db.prepare(`SELECT COUNT(*) as c FROM users WHERE id <= 1000`).get();
    const u = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
    return u && u.id <= 1000;
  });

  return newBadges;
}

// GET /api/badges/my — user's earned badges
router.get('/my', authenticateToken, (req, res) => {
  try {
    const badges = db.prepare(`SELECT * FROM badges WHERE user_id = ? ORDER BY earned_at DESC`).all(req.user.id);
    const earnedTypes = new Set(badges.map(b => b.badge_type));
    const all = BADGE_DEFINITIONS.map(def => ({
      ...def,
      earned: earnedTypes.has(def.type),
      earned_at: badges.find(b => b.badge_type === def.type)?.earned_at || null,
    }));
    res.json({ badges: all });
  } catch (e) {
    logger.error('Failed to fetch badges:', e.message);
    res.json({ badges: BADGE_DEFINITIONS.map(def => ({ ...def, earned: false, earned_at: null })) });
  }
});

// GET /api/badges/check — check and award new badges
router.get('/check', authenticateToken, (req, res) => {
  const newBadges = checkAndAwardBadges(req.user.id);
  res.json({ newBadges });
});

// GET /api/badges/user/:userId — public badge display
router.get('/user/:userId', (req, res) => {
  try {
    const badges = db.prepare(`SELECT badge_type, badge_name, icon, earned_at FROM badges WHERE user_id = ? ORDER BY earned_at DESC`).all(req.params.userId);
    res.json({ badges });
  } catch {
    res.json({ badges: [] });
  }
});

module.exports = router;
module.exports.checkAndAwardBadges = checkAndAwardBadges;
