/**
 * File Upload Routes
 * 
 * POST /api/uploads/avatar     — User avatar (jpg/png/webp, max 2MB)
 * POST /api/uploads/logo       — Company logo (jpg/png/webp/svg, max 5MB)
 * POST /api/uploads/cv         — CV/Resume (pdf/doc/docx, max 10MB)
 * POST /api/uploads/banner     — Banner image (jpg/png/webp, max 5MB)
 * 
 * Files stored in server/data/uploads/<type>/<userId>-<timestamp>.<ext>
 * Served statically at /uploads/<type>/<filename>
 */

const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(dataDir, 'uploads');

// Ensure upload dirs exist
['avatars', 'logos', 'cvs', 'banners'].forEach(dir => {
  const p = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ─── Multer Configs ─────────────────────────────────────────────────

const imageFilter = (req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
  if (allowed.test(path.extname(file.originalname)) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP, SVG) are allowed'), false);
  }
};

const docFilter = (req, file, cb) => {
  const allowed = /\.(pdf|doc|docx)$/i;
  const allowedMime = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowed.test(path.extname(file.originalname)) || allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed'), false);
  }
};

function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, subdir)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${req.user.id}-${Date.now()}${ext}`;
      cb(null, name);
    },
  });
}

const avatarUpload = multer({ storage: makeStorage('avatars'), fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } });
const logoUpload = multer({ storage: makeStorage('logos'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const cvUpload = multer({ storage: makeStorage('cvs'), fileFilter: docFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const bannerUpload = multer({ storage: makeStorage('banners'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Error handler for multer
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
}

// Helper: delete old file if it exists
function deleteOldFile(filePath) {
  if (!filePath) return;
  // Extract actual filesystem path from URL path
  const filename = filePath.replace(/^\/uploads\//, '');
  const fullPath = path.join(UPLOAD_DIR, filename);
  try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch(e) {}
}

// ─── Routes ─────────────────────────────────────────────────────────

// POST /avatar — Upload user avatar
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), handleMulterError, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const url = `/uploads/avatars/${req.file.filename}`;
    
    // Delete old avatar
    const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.user.id);
    deleteOldFile(user?.avatar_url);
    
    // Update user record
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(url, req.user.id);
    
    res.json({ url, message: 'Avatar uploaded successfully' });
  } catch (error) {
    logger.error('Avatar upload error', { error: error.message });
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// POST /logo — Upload company logo (employer only)
router.post('/logo', authenticateToken, requireRole('employer'), logoUpload.single('logo'), handleMulterError, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const url = `/uploads/logos/${req.file.filename}`;
    
    // Delete old logo
    const profile = db.prepare('SELECT logo_url FROM profiles_employer WHERE user_id = ?').get(req.user.id);
    deleteOldFile(profile?.logo_url);
    
    // Update employer profile
    db.prepare('UPDATE profiles_employer SET logo_url = ? WHERE user_id = ?').run(url, req.user.id);
    
    res.json({ url, message: 'Logo uploaded successfully' });
  } catch (error) {
    logger.error('Logo upload error', { error: error.message });
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// POST /cv — Upload CV/Resume (jobseeker only)
router.post('/cv', authenticateToken, requireRole('jobseeker'), cvUpload.single('cv'), handleMulterError, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const url = `/uploads/cvs/${req.file.filename}`;
    
    // Delete old CV
    const profile = db.prepare('SELECT cv_url FROM profiles_jobseeker WHERE user_id = ?').get(req.user.id);
    deleteOldFile(profile?.cv_url);
    
    // Update jobseeker profile
    db.prepare('UPDATE profiles_jobseeker SET cv_url = ? WHERE user_id = ?').run(url, req.user.id);
    
    // Also create/update in resumes table
    const existing = db.prepare('SELECT id FROM resumes WHERE user_id = ? AND is_primary = 1').get(req.user.id);
    if (existing) {
      db.prepare('UPDATE resumes SET file_url = ?, file_name = ?, title = ? WHERE id = ?')
        .run(url, req.file.originalname, req.file.originalname, existing.id);
    } else {
      db.prepare('INSERT INTO resumes (user_id, file_url, file_name, title, is_primary) VALUES (?, ?, ?, ?, 1)')
        .run(req.user.id, url, req.file.originalname, req.file.originalname);
    }
    
    res.json({ url, filename: req.file.originalname, message: 'CV uploaded successfully' });
  } catch (error) {
    logger.error('CV upload error', { error: error.message });
    res.status(500).json({ error: 'Failed to upload CV' });
  }
});

// POST /banner — Upload banner image (employer or admin)
router.post('/banner', authenticateToken, bannerUpload.single('banner'), handleMulterError, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only employers and admins can upload banners' });
    }
    
    const url = `/uploads/banners/${req.file.filename}`;
    res.json({ url, message: 'Banner uploaded successfully' });
  } catch (error) {
    logger.error('Banner upload error', { error: error.message });
    res.status(500).json({ error: 'Failed to upload banner' });
  }
});

// DELETE /avatar — Remove user avatar
router.delete('/avatar', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.user.id);
    deleteOldFile(user?.avatar_url);
    db.prepare('UPDATE users SET avatar_url = NULL WHERE id = ?').run(req.user.id);
    res.json({ message: 'Avatar removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

module.exports = router;
