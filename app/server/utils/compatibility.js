/**
 * Job Compatibility Scoring (Part 2.5)
 * Calculates match score between a jobseeker profile and a job
 */

const logger = require('./logger');

/**
 * Calculate compatibility score between jobseeker and job
 * @param {Object} profile - Jobseeker profile from profiles_jobseeker
 * @param {Object} job - Job details
 * @param {boolean} useSemantic - Whether to include semantic similarity (default: true)
 * @returns {Object} - { score, breakdown, tips }
 */
function calculateCompatibility(profile, job, useSemantic = true) {
  if (!profile || !job) {
    return { score: 0, breakdown: {}, tips: [] };
  }

  let totalScore = 0;
  const breakdown = {};
  const tips = [];

  // Try semantic similarity first (if enabled and available)
  let semanticBoost = 0;
  if (useSemantic) {
    try {
      const vectorStore = require('../lib/vector-store');
      const profileVector = vectorStore.getVector('profile', profile.user_id);
      const jobVector = vectorStore.getVector('job', job.id);
      
      if (profileVector && jobVector) {
        const { cosineSimilarity } = require('../lib/embedding-engine');
        const similarity = cosineSimilarity(profileVector, jobVector);
        // Semantic similarity can boost score by up to 20%
        semanticBoost = similarity * 20;
        breakdown.semantic = Math.round(semanticBoost);
      }
    } catch (e) {
      // Semantic matching not available or failed, continue with traditional scoring
      logger.debug('Semantic matching not available for compatibility score:', e.message);
    }
  }

  // Skills match (35% - reduced from 40% to make room for semantic)
  const skillsResult = matchSkills(profile, job);
  totalScore += skillsResult.score * 0.875; // Scale down from 40 to 35
  breakdown.skills = Math.round(skillsResult.score * 0.875);
  if (skillsResult.missing.length > 0) {
    tips.push(`Add ${skillsResult.missing.slice(0, 2).join(', ')} to your skills to improve match`);
  }

  // Location match (20%)
  const locationResult = matchLocation(profile, job);
  totalScore += locationResult.score;
  breakdown.location = locationResult.score;

  // Experience match (15%)
  const experienceResult = matchExperience(profile, job);
  totalScore += experienceResult.score;
  breakdown.experience = experienceResult.score;
  if (experienceResult.tip) {
    tips.push(experienceResult.tip);
  }

  // Salary match (15%)
  const salaryResult = matchSalary(profile, job);
  totalScore += salaryResult.score;
  breakdown.salary = salaryResult.score;

  // Industry match (10%)
  const industryResult = matchIndustry(profile, job);
  totalScore += industryResult.score;
  breakdown.industry = industryResult.score;
  
  // Add semantic boost (up to 20%)
  totalScore += semanticBoost;

  return {
    score: Math.round(Math.min(totalScore, 100)), // Cap at 100
    breakdown,
    tips,
    strengths: getStrengths(breakdown),
    weaknesses: getWeaknesses(breakdown, tips),
    method: semanticBoost > 0 ? 'hybrid' : 'traditional'
  };
}

function matchSkills(profile, job) {
  // Parse user skills
  let userSkills = [];
  try {
    if (profile.skills) {
      const parsed = JSON.parse(profile.skills);
      userSkills = Array.isArray(parsed) ? parsed.map(s => s.toLowerCase().trim()) : [];
    }
  } catch {
    if (typeof profile.skills === 'string') {
      userSkills = profile.skills.split(',').map(s => s.toLowerCase().trim());
    }
  }

  // Parse job skills
  let jobSkills = [];
  try {
    if (job.skills) {
      const parsed = JSON.parse(job.skills);
      jobSkills = Array.isArray(parsed) ? parsed : job.skills.split(',').map(s => s.trim());
    }
  } catch {
    if (typeof job.skills === 'string') {
      jobSkills = job.skills.split(',').map(s => s.trim());
    }
  }

  if (jobSkills.length === 0) {
    return { score: 20, matched: [], missing: [] }; // Neutral score if no skills specified
  }

  if (userSkills.length === 0) {
    return { score: 0, matched: [], missing: jobSkills };
  }

  // Find matches
  const matched = jobSkills.filter(jobSkill => 
    userSkills.some(userSkill => 
      userSkill.includes(jobSkill.toLowerCase()) || 
      jobSkill.toLowerCase().includes(userSkill)
    )
  );

  const missing = jobSkills.filter(js => !matched.includes(js));

  const matchPercentage = matched.length / jobSkills.length;
  const score = matchPercentage * 40;

  return { score, matched, missing };
}

function matchLocation(profile, job) {
  if (!job.location) {
    return { score: 10 }; // Neutral if location not specified
  }

  const jobLoc = job.location.toLowerCase();
  
  // Remote work gets high score
  if (jobLoc.includes('remote')) {
    return { score: 20 };
  }

  if (!profile.location) {
    return { score: 5 }; // Low score if user hasn't specified location
  }

  const userLoc = profile.location.toLowerCase();
  const userCountry = (profile.country || '').toLowerCase();
  const jobCountry = (job.country || '').toLowerCase();

  // Exact match
  if (userLoc === jobLoc) {
    return { score: 20 };
  }

  // Same country
  if (userCountry && jobCountry && userCountry === jobCountry) {
    return { score: 12 };
  }

  // Partial match (city in location string)
  if (userLoc && (jobLoc.includes(userLoc) || userLoc.includes(jobLoc))) {
    return { score: 15 };
  }

  return { score: 0 };
}

function matchExperience(profile, job) {
  if (!job.experience_level) {
    return { score: 8, tip: null }; // Neutral if not specified
  }

  // Calculate years of experience from work history
  let yearsOfExperience = 0;
  try {
    if (profile.work_history) {
      const parsed = JSON.parse(profile.work_history);
      if (Array.isArray(parsed)) {
        yearsOfExperience = parsed.length; // Rough estimate: 1 job = ~2 years
      }
    }
  } catch {}

  const jobLevel = job.experience_level.toLowerCase();

  // Entry level
  if (jobLevel.includes('entry') || jobLevel.includes('junior')) {
    if (yearsOfExperience <= 2) {
      return { score: 15, tip: null };
    } else {
      return { score: 10, tip: null }; // Overqualified but still okay
    }
  }

  // Mid level
  if (jobLevel.includes('mid') || jobLevel.includes('intermediate')) {
    if (yearsOfExperience >= 2 && yearsOfExperience <= 5) {
      return { score: 15, tip: null };
    } else if (yearsOfExperience < 2) {
      return { score: 5, tip: 'Add more work experience to improve match for mid-level roles' };
    } else {
      return { score: 10, tip: null };
    }
  }

  // Senior level
  if (jobLevel.includes('senior') || jobLevel.includes('lead')) {
    if (yearsOfExperience >= 5) {
      return { score: 15, tip: null };
    } else {
      return { score: 3, tip: 'Add more senior-level experience to match this role' };
    }
  }

  return { score: 8, tip: null };
}

function matchSalary(profile, job) {
  if (!job.salary_min && !job.salary_max) {
    return { score: 8 }; // Neutral if no salary info
  }

  if (!profile.desired_salary_min && !profile.desired_salary_max) {
    return { score: 8 }; // Neutral if user hasn't set expectations
  }

  const jobMin = job.salary_min || 0;
  const jobMax = job.salary_max || job.salary_min || 0;
  const userMin = profile.desired_salary_min || 0;

  // Job salary meets or exceeds user's minimum
  if (jobMax >= userMin) {
    return { score: 15 };
  }

  // Job salary is close (within 20%)
  if (jobMax >= userMin * 0.8) {
    return { score: 10 };
  }

  // Below expectations
  return { score: 3 };
}

function matchIndustry(profile, job) {
  if (!job.industry) {
    return { score: 5 }; // Neutral if not specified
  }

  // Parse user skills to see if they relate to industry
  let userSkills = [];
  try {
    if (profile.skills) {
      const parsed = JSON.parse(profile.skills);
      userSkills = Array.isArray(parsed) ? parsed.map(s => s.toLowerCase()) : [];
    }
  } catch {}

  const jobIndustry = job.industry.toLowerCase();

  // Check if any skills relate to industry
  const industryMatch = userSkills.some(skill => 
    jobIndustry.includes(skill) || skill.includes(jobIndustry)
  );

  if (industryMatch) {
    return { score: 10 };
  }

  return { score: 3 };
}

function getStrengths(breakdown) {
  const strengths = [];
  if (breakdown.skills >= 30) strengths.push('Strong skills match');
  if (breakdown.location >= 15) strengths.push('Great location fit');
  if (breakdown.experience >= 12) strengths.push('Right experience level');
  if (breakdown.salary >= 12) strengths.push('Salary expectations met');
  return strengths;
}

function getWeaknesses(breakdown, tips) {
  const weaknesses = [];
  if (breakdown.skills < 20) weaknesses.push('Consider adding more relevant skills');
  if (breakdown.location < 10) weaknesses.push('Location may not be ideal');
  if (breakdown.experience < 8) weaknesses.push('Experience level may not match');
  return weaknesses;
}

module.exports = {
  calculateCompatibility
};
