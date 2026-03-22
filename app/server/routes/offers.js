const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const db = require("../database");
const { sendEmail } = require("../lib/email");

// Create offer (employer only)
router.post("/", authenticateToken, requireRole("employer"), async (req, res) => {
  try {
    const { application_id, salary, start_date, contract_type, benefits } = req.body;
    
    const application = db.prepare(`
      SELECT a.*, j.id as job_id, j.title as job_title, j.employer_id, j.company_name,
             u.email as candidate_email, u.name as candidate_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ? AND j.employer_id = ?
    `).get(application_id, req.user.employer_id || req.user.id);
    
    if (!application) return res.status(404).json({ error: "Application not found" });
    
    const result = db.prepare(`
      INSERT INTO offers (application_id, employer_id, jobseeker_id, job_id, salary, start_date, contract_type, benefits, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, "pending", datetime("now"))
    `).run(application_id, req.user.employer_id || req.user.id, application.user_id, application.job_id, salary, start_date, contract_type, benefits || "");
    
    db.prepare("UPDATE applications SET status = ? WHERE id = ?").run("offered", application_id);
    
    res.status(201).json({ success: true, offer_id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all offers
router.get("/", authenticateToken, async (req, res) => {
  try {
    let offers;
    if (req.user.role === "employer" || req.user.role === "agency") {
      offers = db.prepare(`
        SELECT o.*, j.title as job_title, j.company_name, u.name as candidate_name
        FROM offers o
        JOIN jobs j ON o.job_id = j.id
        JOIN users u ON o.jobseeker_id = u.id
        WHERE o.employer_id = ?
        ORDER BY o.created_at DESC
      `).all(req.user.employer_id || req.user.id);
    } else {
      offers = db.prepare(`
        SELECT o.*, j.title as job_title, j.company_name
        FROM offers o
        JOIN jobs j ON o.job_id = j.id
        WHERE o.jobseeker_id = ?
        ORDER BY o.created_at DESC
      `).all(req.user.id);
    }
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept offer
router.post("/:id/accept", authenticateToken, async (req, res) => {
  try {
    const offer = db.prepare("SELECT * FROM offers WHERE id = ? AND jobseeker_id = ? AND status = ?")
      .get(req.params.id, req.user.id, "pending");
    
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    
    db.prepare("UPDATE offers SET status = ?, responded_at = datetime(\"now\") WHERE id = ?")
      .run("accepted", req.params.id);
    db.prepare("UPDATE applications SET status = ? WHERE id = ?").run("hired", offer.application_id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject offer
router.post("/:id/reject", authenticateToken, async (req, res) => {
  try {
    const offer = db.prepare("SELECT * FROM offers WHERE id = ? AND jobseeker_id = ? AND status = ?")
      .get(req.params.id, req.user.id, "pending");
    
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    
    db.prepare("UPDATE offers SET status = ?, responded_at = datetime(\"now\") WHERE id = ?")
      .run("rejected", req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
