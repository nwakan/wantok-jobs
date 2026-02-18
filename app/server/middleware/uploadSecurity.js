/**
 * File Upload Security Middleware
 * 
 * Hardens file uploads with:
 * - Magic byte validation (not just extension)
 * - File size limits
 * - Filename sanitization (prevent path traversal)
 * - Allowed file types enforcement
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Magic bytes for file type validation
const MAGIC_BYTES = {
  // Images
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  
  // Documents
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0]], // DOC (OLE)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]], // DOCX (ZIP)
};

// Allowed file types by category
const ALLOWED_TYPES = {
  avatar: {
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    maxSize: 2 * 1024 * 1024, // 2MB
  },
  logo: {
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  cv: {
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['.pdf', '.doc', '.docx'],
    maxSize: 5 * 1024 * 1024, // 5MB (reduced from 10MB)
  },
  banner: {
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  document: {
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['.pdf', '.doc', '.docx'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  photo: {
    mimes: ['image/jpeg', 'image/png'],
    extensions: ['.jpg', '.jpeg', '.png'],
    maxSize: 2 * 1024 * 1024, // 2MB
  },
};

/**
 * Read magic bytes from file
 */
function readMagicBytes(filePath, length = 8) {
  try {
    const buffer = Buffer.alloc(length);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, length, 0);
    fs.closeSync(fd);
    return Array.from(buffer);
  } catch (error) {
    logger.error('Error reading magic bytes', { error: error.message, filePath });
    return null;
  }
}

/**
 * Validate file type by magic bytes
 */
function validateMagicBytes(filePath, expectedMimeType) {
  const magicSignatures = MAGIC_BYTES[expectedMimeType];
  if (!magicSignatures) {
    // SVG doesn't have magic bytes, allow it if expected
    if (expectedMimeType === 'image/svg+xml') return true;
    logger.warn('No magic bytes defined for mime type', { expectedMimeType });
    return false;
  }
  
  const fileBytes = readMagicBytes(filePath, 8);
  if (!fileBytes) return false;
  
  // Check if file starts with any of the expected signatures
  return magicSignatures.some(signature => {
    return signature.every((byte, index) => fileBytes[index] === byte);
  });
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
function sanitizeFilename(filename) {
  if (!filename) return 'file';
  
  // Remove path separators and null bytes
  let safe = filename
    .replace(/[\/\\]/g, '_')
    .replace(/\0/g, '')
    .replace(/\.\./g, '');
  
  // Remove leading dots (hidden files)
  safe = safe.replace(/^\.+/, '');
  
  // Limit length
  if (safe.length > 255) {
    const ext = path.extname(safe);
    safe = safe.substring(0, 255 - ext.length) + ext;
  }
  
  // If nothing left, use default
  if (!safe || safe === '') {
    safe = 'file';
  }
  
  return safe;
}

/**
 * Validate uploaded file
 * 
 * @param {Object} file - Multer file object
 * @param {string} category - File category (avatar, cv, logo, etc.)
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateUpload(file, category = 'document') {
  const config = ALLOWED_TYPES[category];
  if (!config) {
    return { valid: false, error: `Unknown file category: ${category}` };
  }
  
  // Check file size
  if (file.size > config.maxSize) {
    const maxMB = (config.maxSize / 1024 / 1024).toFixed(1);
    return { valid: false, error: `File too large. Maximum size: ${maxMB}MB` };
  }
  
  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!config.extensions.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${config.extensions.join(', ')}`,
    };
  }
  
  // Check MIME type
  if (!config.mimes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Expected: ${config.mimes.join(', ')}`,
    };
  }
  
  // Check magic bytes (most important check)
  if (!validateMagicBytes(file.path, file.mimetype)) {
    logger.warn('Magic bytes validation failed', {
      filename: file.originalname,
      mimetype: file.mimetype,
      category,
    });
    return {
      valid: false,
      error: 'File content does not match declared type',
    };
  }
  
  return { valid: true };
}

/**
 * Upload security middleware factory
 * 
 * Usage: uploadSecurity('avatar')
 */
function uploadSecurity(category = 'document') {
  return (req, res, next) => {
    // If no file uploaded, skip validation
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Sanitize original filename
      file.originalname = sanitizeFilename(file.originalname);
      
      // Validate file
      const validation = validateUpload(file, category);
      if (!validation.valid) {
        // Delete the uploaded file
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (e) {
          logger.error('Error deleting invalid upload', { error: e.message });
        }
        
        logger.warn('File upload rejected', {
          filename: file.originalname,
          category,
          error: validation.error,
          userId: req.user?.id,
          ip: req.ip,
        });
        
        // Attach security event
        req.securityEvent = {
          type: 'INVALID_FILE_UPLOAD',
          details: {
            filename: file.originalname,
            category,
            error: validation.error,
          },
          riskLevel: 'MEDIUM',
        };
        
        return res.status(400).json({
          error: validation.error,
          code: 'INVALID_FILE',
        });
      }
    }
    
    // Log successful upload
    logger.info('File upload validated', {
      files: files.map(f => ({ name: f.originalname, size: f.size })),
      category,
      userId: req.user?.id,
    });
    
    next();
  };
}

module.exports = {
  uploadSecurity,
  sanitizeFilename,
  validateUpload,
  validateMagicBytes,
};
