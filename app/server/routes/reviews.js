const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /company/:id/summary — Get review summary for a company (for job detail page)
router.get('/company/:id/summary', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(AVG(rating), 0) as rating
      FROM company_reviews
      WHERE company_id = ? AND approved = 1
    `).get(req.params.id);

    res.json(stats);
  } catch (error) {
    console.error('Get review summary error:', error);
    res.status(500).json({ error: 'Failed to fetch review summary' });
  }
});

// GET /companies/:id/reviews — Get all reviews for a company with advanced stats
router.get('/companies/:id/reviews', (req, res) => {
  try {
    const { sort = 'newest' } = req.query;
    
    // Determine sort order
    let orderBy = 'r.created_at DESC';
    if (sort === 'oldest') orderBy = 'r.created_at ASC';
    else if (sort === 'highest') orderBy = 'r.rating DESC';
    else if (sort === 'lowest') orderBy = 'r.rating ASC';
    else if (sort === 'helpful') orderBy = 'r.helpful_count DESC';

    const reviews = db.prepare(`
      SELECT 
        r.*,
        u.name as reviewer_name,
        pe.company_display_name as reviewer_company
      FROM company_reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE r.company_id = ? AND r.approved = 1
      ORDER BY ${orderBy}
    `).all(req.params.id);

    // Overall stats
    const overallStats = db.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as average_rating,
        COALESCE(AVG(work_life_balance), 0) as avg_work_life_balance,
        COALESCE(AVG(culture_values), 0) as avg_culture_values,
        COALESCE(AVG(career_opportunities), 0) as avg_career_opportunities,
        COALESCE(AVG(compensation_benefits), 0) as avg_compensation_benefits,
        COALESCE(AVG(senior_management), 0) as avg_senior_management,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM company_reviews
      WHERE company_id = ? AND approved = 1
    `).get(req.params.id);

    // CEO approval stats
    const ceoStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN ceo_approval = 'approve' THEN 1 ELSE 0 END) as approve_count,
        SUM(CASE WHEN ceo_approval = 'disapprove' THEN 1 ELSE 0 END) as disapprove_count,
        SUM(CASE WHEN ceo_approval = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
        COUNT(*) as total_responses
      FROM company_reviews
      WHERE company_id = ? AND approved = 1 AND ceo_approval IS NOT NULL
    `).get(req.params.id);

    // Recommend to friend stats
    const recommendStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN recommend_to_friend = 1 THEN 1 ELSE 0 END) as recommend_count,
        COUNT(*) as total_responses
      FROM company_reviews
      WHERE company_id = ? AND approved = 1
    `).get(req.params.id);

    res.json({ 
      reviews, 
      stats: {
        ...overallStats,
        ceo_approval: ceoStats,
        recommend_to_friend: recommendStats
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /reviews — Create a new comprehensive review
router.post('/reviews', authenticateToken, (req, res) => {
  try {
    const { 
      company_id, 
      rating, 
      title, 
      pros, 
      cons, 
      advice, 
      is_current_employee,
      job_title,
      work_location,
      years_worked,
      work_life_balance,
      culture_values,
      career_opportunities,
      compensation_benefits,
      senior_management,
      ceo_approval,
      recommend_to_friend
    } = req.body;

    if (!company_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'company_id and valid rating (1-5) required' });
    }

    // Check if company exists
    const company = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(company_id, 'employer');
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if user already reviewed this company
    const existing = db.prepare('SELECT * FROM company_reviews WHERE company_id = ? AND reviewer_id = ?')
      .get(company_id, req.user.id);
    
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this company' });
    }

    const result = db.prepare(`
      INSERT INTO company_reviews (
        company_id, reviewer_id, rating, title, pros, cons, advice, 
        is_current_employee, job_title, work_location, years_worked,
        work_life_balance, culture_values, career_opportunities, 
        compensation_benefits, senior_management, ceo_approval, 
        recommend_to_friend, approved
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      company_id, req.user.id, rating, title || '', pros || '', cons || '', advice || '',
      is_current_employee ? 1 : 0, job_title || null, work_location || null, years_worked || null,
      work_life_balance || 0, culture_values || 0, career_opportunities || 0,
      compensation_benefits || 0, senior_management || 0, ceo_approval || null,
      recommend_to_friend || 0
    );

    const review = db.prepare('SELECT * FROM company_reviews WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ 
      review, 
      message: 'Review submitted successfully. It will be visible after approval.' 
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// POST /reviews/:id/helpful — Mark review as helpful or not
router.post('/reviews/:id/helpful', authenticateToken, (req, res) => {
  try {
    const { helpful } = req.body; // 1 for helpful, -1 for not helpful

    if (![1, -1].includes(helpful)) {
      return res.status(400).json({ error: 'helpful must be 1 or -1' });
    }

    // Check if review exists
    const review = db.prepare('SELECT * FROM company_reviews WHERE id = ?').get(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user already voted
    const existing = db.prepare('SELECT * FROM review_helpfulness WHERE review_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (existing) {
      // Update existing vote
      db.prepare('UPDATE review_helpfulness SET helpful = ? WHERE review_id = ? AND user_id = ?')
        .run(helpful, req.params.id, req.user.id);
      
      // Recalculate counts
      updateHelpfulCounts(req.params.id);
    } else {
      // Insert new vote
      db.prepare('INSERT INTO review_helpfulness (review_id, user_id, helpful) VALUES (?, ?, ?)')
        .run(req.params.id, req.user.id, helpful);
      
      // Update counts
      updateHelpfulCounts(req.params.id);
    }

    res.json({ message: 'Vote recorded successfully' });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// GET /companies/:id/photos — Get company photos
router.get('/companies/:id/photos', (req, res) => {
  try {
    const photos = db.prepare(`
      SELECT p.*, u.name as uploader_name
      FROM company_photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE p.company_id = ? AND p.approved = 1
      ORDER BY p.created_at DESC
    `).all(req.params.id);

    res.json({ photos });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// POST /companies/:id/photos — Upload company photo
router.post('/companies/:id/photos', authenticateToken, (req, res) => {
  try {
    const { photo_url, caption } = req.body;

    if (!photo_url) {
      return res.status(400).json({ error: 'photo_url required' });
    }

    const result = db.prepare(`
      INSERT INTO company_photos (company_id, photo_url, caption, uploaded_by, approved)
      VALUES (?, ?, ?, ?, 0)
    `).run(req.params.id, photo_url, caption || '', req.user.id);

    const photo = db.prepare('SELECT * FROM company_photos WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ 
      photo, 
      message: 'Photo submitted successfully. It will be visible after approval.' 
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// GET /companies/:id/benefits — Get company benefits
router.get('/companies/:id/benefits', (req, res) => {
  try {
    const benefits = db.prepare(`
      SELECT benefit_name, category
      FROM company_benefits
      WHERE company_id = ?
      ORDER BY category, benefit_name
    `).all(req.params.id);

    // Group by category
    const grouped = benefits.reduce((acc, benefit) => {
      const cat = benefit.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(benefit.benefit_name);
      return acc;
    }, {});

    res.json({ benefits: grouped });
  } catch (error) {
    console.error('Get benefits error:', error);
    res.status(500).json({ error: 'Failed to fetch benefits' });
  }
});

// POST /companies/:id/benefits — Add company benefit (employer only)
router.post('/companies/:id/benefits', authenticateToken, (req, res) => {
  try {
    const { benefit_name, category } = req.body;

    if (!benefit_name) {
      return res.status(400).json({ error: 'benefit_name required' });
    }

    // Check if user is the company owner
    if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only company owners can add benefits' });
    }

    db.prepare(`
      INSERT INTO company_benefits (company_id, benefit_name, category)
      VALUES (?, ?, ?)
    `).run(req.params.id, benefit_name, category || 'Other');

    res.json({ message: 'Benefit added successfully' });
  } catch (error) {
    console.error('Add benefit error:', error);
    res.status(500).json({ error: 'Failed to add benefit' });
  }
});

// GET /companies/:id/interviews — Get interview reviews
router.get('/companies/:id/interviews', (req, res) => {
  try {
    const interviews = db.prepare(`
      SELECT i.*, u.name as reviewer_name
      FROM interview_reviews i
      LEFT JOIN users u ON i.reviewer_id = u.id
      WHERE i.company_id = ? AND i.approved = 1
      ORDER BY i.created_at DESC
    `).all(req.params.id);

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_interviews,
        AVG(interview_difficulty) as avg_difficulty,
        SUM(CASE WHEN interview_experience = 'positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN interview_experience = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
        SUM(CASE WHEN interview_experience = 'negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN got_offer = 1 THEN 1 ELSE 0 END) as got_offer_count
      FROM interview_reviews
      WHERE company_id = ? AND approved = 1
    `).get(req.params.id);

    res.json({ interviews, stats });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ error: 'Failed to fetch interview reviews' });
  }
});

// POST /interviews — Submit interview review
router.post('/interviews', authenticateToken, (req, res) => {
  try {
    const {
      company_id,
      job_title,
      interview_difficulty,
      interview_experience,
      got_offer,
      interview_process,
      interview_questions
    } = req.body;

    if (!company_id) {
      return res.status(400).json({ error: 'company_id required' });
    }

    const result = db.prepare(`
      INSERT INTO interview_reviews (
        company_id, reviewer_id, job_title, interview_difficulty,
        interview_experience, got_offer, interview_process, 
        interview_questions, approved
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      company_id, req.user.id, job_title || '', interview_difficulty || 0,
      interview_experience || 'neutral', got_offer ? 1 : 0, 
      interview_process || '', interview_questions || ''
    );

    const interview = db.prepare('SELECT * FROM interview_reviews WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ 
      interview, 
      message: 'Interview review submitted successfully. It will be visible after approval.' 
    });
  } catch (error) {
    console.error('Submit interview error:', error);
    res.status(500).json({ error: 'Failed to submit interview review' });
  }
});

// Helper function to update helpful counts
function updateHelpfulCounts(reviewId) {
  const counts = db.prepare(`
    SELECT 
      SUM(CASE WHEN helpful = 1 THEN 1 ELSE 0 END) as helpful,
      SUM(CASE WHEN helpful = -1 THEN 1 ELSE 0 END) as not_helpful
    FROM review_helpfulness
    WHERE review_id = ?
  `).get(reviewId);

  db.prepare(`
    UPDATE company_reviews
    SET helpful_count = ?, not_helpful_count = ?
    WHERE id = ?
  `).run(counts.helpful || 0, counts.not_helpful || 0, reviewId);
}

module.exports = router;
