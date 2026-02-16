const express = require('express');
const router = express.Router();
const db = require('../database');

// POST / — Subscribe to newsletter
router.post('/', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Check if already subscribed
    const existing = db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email);
    if (existing) {
      return res.json({ message: 'Already subscribed!' });
    }

    db.prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)').run(email);
    
    res.status(201).json({ message: 'Successfully subscribed to newsletter!' });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

module.exports = router;
