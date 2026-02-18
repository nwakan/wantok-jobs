/**
 * Profile Insights API (Part 2.3)
 * Provides actionable profile completion tips and match potential
 */

const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/profile/insights - Get profile completion insights
router.get('/insights', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const userId = req.user.id;

    // Get jobseeker profile
    const profile = db.prepare(`
      SELECT * FROM profiles_jobseeker WHERE user_id = ?
    `).get(userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Calculate profile completeness
    const completeness = calculateProfileCompleteness(profile);

    // Get actionable tips
    const tips = generateActionableTips(profile);

    // Get match potential
    const matchPotential = calculateMatchPotential(profile);

    // Get competitor insight
    const competitorInsight = getCompetitorInsight(profile);

    res.json({
      completeness: completeness.percentage,
      score: completeness.percentage,
      breakdown: completeness.breakdown,
      tips,
      matchPotential,
      competitorInsight
    });
  } catch (error) {
    logger.error('Profile insights error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch profile insights' });
  }
});

function calculateProfileCompleteness(profile) {
  const fields = {
    basic_info: { weight: 15, fields: ['phone', 'location', 'country'] },
    headline: { weight: 10, field: 'headline' },
    bio: { weight: 10, field: 'bio' },
    skills: { weight: 20, field: 'skills' },
    work_history: { weight: 15, field: 'work_history' },
    education: { weight: 10, field: 'education' },
    cv: { weight: 15, field: 'cv_url' },
    photo: { weight: 5, field: 'profile_photo_url' }
  };

  let totalScore = 0;
  const breakdown = {};

  // Basic info
  const basicComplete = fields.basic_info.fields.filter(f => profile[f]).length;
  const basicScore = (basicComplete / fields.basic_info.fields.length) * fields.basic_info.weight;
  totalScore += basicScore;
  breakdown.basic_info = { score: Math.round(basicScore), max: fields.basic_info.weight };

  // Headline
  if (profile.headline && profile.headline.length > 10) {
    totalScore += fields.headline.weight;
    breakdown.headline = { score: fields.headline.weight, max: fields.headline.weight };
  } else {
    breakdown.headline = { score: 0, max: fields.headline.weight };
  }

  // Bio
  if (profile.bio && profile.bio.length > 50) {
    totalScore += fields.bio.weight;
    breakdown.bio = { score: fields.bio.weight, max: fields.bio.weight };
  } else {
    breakdown.bio = { score: 0, max: fields.bio.weight };
  }

  // Skills
  let skillsCount = 0;
  try {
    if (profile.skills) {
      const parsed = JSON.parse(profile.skills);
      skillsCount = Array.isArray(parsed) ? parsed.length : 0;
    }
  } catch {}
  const skillsScore = Math.min(skillsCount / 5, 1) * fields.skills.weight; // Max at 5 skills
  totalScore += skillsScore;
  breakdown.skills = { score: Math.round(skillsScore), max: fields.skills.weight };

  // Work history
  let workCount = 0;
  try {
    if (profile.work_history) {
      const parsed = JSON.parse(profile.work_history);
      workCount = Array.isArray(parsed) ? parsed.length : 0;
    }
  } catch {}
  const workScore = Math.min(workCount / 2, 1) * fields.work_history.weight; // Max at 2 jobs
  totalScore += workScore;
  breakdown.work_history = { score: Math.round(workScore), max: fields.work_history.weight };

  // Education
  let eduCount = 0;
  try {
    if (profile.education) {
      const parsed = JSON.parse(profile.education);
      eduCount = Array.isArray(parsed) ? parsed.length : 0;
    }
  } catch {}
  const eduScore = Math.min(eduCount / 1, 1) * fields.education.weight; // Max at 1
  totalScore += eduScore;
  breakdown.education = { score: Math.round(eduScore), max: fields.education.weight };

  // CV
  if (profile.cv_url) {
    totalScore += fields.cv.weight;
    breakdown.cv = { score: fields.cv.weight, max: fields.cv.weight };
  } else {
    breakdown.cv = { score: 0, max: fields.cv.weight };
  }

  // Photo
  if (profile.profile_photo_url) {
    totalScore += fields.photo.weight;
    breakdown.photo = { score: fields.photo.weight, max: fields.photo.weight };
  } else {
    breakdown.photo = { score: 0, max: fields.photo.weight };
  }

  return {
    percentage: Math.round(totalScore),
    breakdown
  };
}

function generateActionableTips(profile) {
  const tips = [];

  // Check skills
  let skillsCount = 0;
  try {
    if (profile.skills) {
      const parsed = JSON.parse(profile.skills);
      skillsCount = Array.isArray(parsed) ? parsed.length : 0;
    }
  } catch {}

  if (skillsCount === 0) {
    tips.push({
      priority: 'high',
      category: 'skills',
      title: 'Add your top skills',
      description: 'Add your top skills — employers search by skills. Profiles with skills get 3x more views.',
      action: 'Add Skills',
      link: '/dashboard/profile'
    });
  } else if (skillsCount < 5) {
    tips.push({
      priority: 'medium',
      category: 'skills',
      title: 'Add more skills',
      description: `You have ${skillsCount} skills. Add ${5 - skillsCount} more to improve your visibility.`,
      action: 'Add Skills',
      link: '/dashboard/profile'
    });
  }

  // Check headline
  if (!profile.headline || profile.headline.length < 10) {
    tips.push({
      priority: 'high',
      category: 'headline',
      title: 'Add a professional headline',
      description: 'Add a headline like "Experienced Accountant | CPA Qualified" — it\'s the first thing employers see.',
      action: 'Add Headline',
      link: '/dashboard/profile'
    });
  }

  // Check CV
  if (!profile.cv_url) {
    tips.push({
      priority: 'critical',
      category: 'cv',
      title: 'Upload your CV',
      description: 'Upload your CV — you can\'t apply to most jobs without one.',
      action: 'Upload CV',
      link: '/dashboard/profile'
    });
  }

  // Check photo
  if (!profile.profile_photo_url) {
    tips.push({
      priority: 'medium',
      category: 'photo',
      title: 'Add a profile photo',
      description: 'Profiles with photos get 40% more engagement from employers.',
      action: 'Add Photo',
      link: '/dashboard/profile'
    });
  }

  // Check work history
  let workCount = 0;
  try {
    if (profile.work_history) {
      const parsed = JSON.parse(profile.work_history);
      workCount = Array.isArray(parsed) ? parsed.length : 0;
    }
  } catch {}

  if (workCount === 0) {
    tips.push({
      priority: 'high',
      category: 'work_history',
      title: 'Add your work experience',
      description: 'Add at least one previous job to show your experience level.',
      action: 'Add Experience',
      link: '/dashboard/profile'
    });
  }

  // Check bio
  if (!profile.bio || profile.bio.length < 50) {
    tips.push({
      priority: 'medium',
      category: 'bio',
      title: 'Write a professional summary',
      description: 'Write a brief summary about yourself and what you\'re looking for.',
      action: 'Add Bio',
      link: '/dashboard/profile'
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function calculateMatchPotential(profile) {
  try {
    // Count currently matching active jobs
    const currentMatches = db.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE status = 'active'
    `).get();

    // Parse skills
    let userSkills = [];
    try {
      if (profile.skills) {
        const parsed = JSON.parse(profile.skills);
        userSkills = Array.isArray(parsed) ? parsed : [];
      }
    } catch {}

    // Estimate potential matches if profile is completed
    let potentialIncrease = 0;
    
    if (!profile.skills || userSkills.length < 3) potentialIncrease += 30;
    if (!profile.headline) potentialIncrease += 15;
    if (!profile.cv_url) potentialIncrease += 25;
    if (!profile.work_history) potentialIncrease += 20;

    const current = Math.round((currentMatches.count || 0) * 0.3); // Assume 30% relevance
    const potential = current + Math.round(current * (potentialIncrease / 100));

    return {
      current,
      potential,
      increase: potential - current,
      message: `Your profile currently matches ${current} active jobs. Complete these fields to match ${potential} more.`
    };
  } catch (error) {
    logger.error('Match potential calculation error', { error: error.message });
    return { current: 0, potential: 0, increase: 0, message: 'Complete your profile to see match potential.' };
  }
}

function getCompetitorInsight(profile) {
  try {
    // Parse skills
    let userSkills = [];
    try {
      if (profile.skills) {
        const parsed = JSON.parse(profile.skills);
        userSkills = Array.isArray(parsed) ? parsed : [];
      }
    } catch {}

    // Count similar jobseekers
    const similarCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM profiles_jobseeker pj
      INNER JOIN users u ON pj.user_id = u.id
      WHERE u.account_status = 'active'
        AND pj.user_id != ?
        AND (pj.skills LIKE ? OR pj.desired_job_type = ?)
    `).get(profile.user_id, `%${userSkills[0] || ''}%`, profile.desired_job_type);

    const count = similarCount?.count || 0;

    let message = `There are ${count} other jobseekers in your field.`;
    
    const standOutTips = [];
    if (!profile.certifications) {
      standOutTips.push('Add certifications');
    }
    if (!profile.profile_photo_url) {
      standOutTips.push('Add a professional photo');
    }
    if (!profile.profile_video_url) {
      standOutTips.push('Add a video introduction');
    }

    if (standOutTips.length > 0) {
      message += ` Here's how to stand out: ${standOutTips.join(', ')}.`;
    } else {
      message += ' Your profile is well-optimized!';
    }

    return {
      count,
      message,
      tips: standOutTips
    };
  } catch (error) {
    logger.error('Competitor insight error', { error: error.message });
    return { count: 0, message: 'Complete your profile to see competitive insights.' };
  }
}

module.exports = router;
