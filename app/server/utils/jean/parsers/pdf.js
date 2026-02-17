/**
 * PDF Text Extractor
 * Uses pdftotext (poppler-utils) on VPS, falls back to raw stream parsing.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../../../utils/logger');

/**
 * Extract text from a PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {string} Extracted text
 */
function extractText(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('File not found');

  // Method 1: pdftotext (best quality)
  try {
    const result = execSync(`pdftotext -layout "${filePath}" -`, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf8',
    });
    if (result.trim().length > 50) return result.trim();
  } catch (e) {
    logger.warn('pdftotext not available or failed', { error: e.message });
  }

  // Method 2: Raw PDF text stream extraction (no dependencies)
  try {
    return extractFromRawPdf(filePath);
  } catch (e) {
    logger.warn('Raw PDF extraction failed', { error: e.message });
  }

  throw new Error('Could not extract text from PDF. It may be a scanned/image PDF.');
}

/**
 * Basic PDF text extraction by reading content streams
 * Works for most text-based PDFs without external tools
 */
function extractFromRawPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const content = buffer.toString('latin1');
  const textParts = [];

  // Extract text between BT and ET markers (text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    // Extract text from Tj, TJ, ' and " operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tm;
    while ((tm = tjRegex.exec(block)) !== null) {
      textParts.push(decodePdfString(tm[1]));
    }
    // TJ arrays
    const tjArrayRegex = /\[((?:[^[\]]*|\([^)]*\))*)\]\s*TJ/gi;
    while ((tm = tjArrayRegex.exec(block)) !== null) {
      const inner = tm[1];
      const strRegex = /\(([^)]*)\)/g;
      let sm;
      while ((sm = strRegex.exec(inner)) !== null) {
        textParts.push(decodePdfString(sm[1]));
      }
    }
  }

  const text = textParts.join(' ').replace(/\s+/g, ' ').trim();
  if (text.length < 50) throw new Error('Insufficient text extracted');
  return text;
}

function decodePdfString(str) {
  // Handle common PDF escape sequences
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

module.exports = { extractText };
