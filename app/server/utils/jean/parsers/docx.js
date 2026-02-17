/**
 * DOCX Text Extractor
 * DOCX files are ZIP archives containing XML. Uses Node.js built-in zlib.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logger = require('../../../utils/logger');

/**
 * Extract text from a .docx file
 * @param {string} filePath - Path to .docx file
 * @returns {string} Extracted text
 */
function extractText(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('File not found');

  const buffer = fs.readFileSync(filePath);

  // DOCX is a ZIP file — find and extract document.xml
  const entries = parseZip(buffer);

  // The main content is in word/document.xml
  const docEntry = entries.find(e => e.name === 'word/document.xml');
  if (!docEntry) throw new Error('Not a valid DOCX file (missing word/document.xml)');

  const xml = docEntry.data.toString('utf8');
  return extractTextFromXml(xml);
}

/**
 * Minimal ZIP parser — enough for DOCX
 */
function parseZip(buffer) {
  const entries = [];

  // Find End of Central Directory
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('Not a valid ZIP file');

  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  const cdCount = buffer.readUInt16LE(eocdOffset + 10);

  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break;

    const compression = buffer.readUInt16LE(pos + 10);
    const compressedSize = buffer.readUInt32LE(pos + 20);
    const uncompressedSize = buffer.readUInt32LE(pos + 24);
    const nameLen = buffer.readUInt16LE(pos + 28);
    const extraLen = buffer.readUInt16LE(pos + 30);
    const commentLen = buffer.readUInt16LE(pos + 32);
    const localHeaderOffset = buffer.readUInt32LE(pos + 42);

    const name = buffer.slice(pos + 46, pos + 46 + nameLen).toString('utf8');

    // Read from local file header
    const localPos = localHeaderOffset;
    if (buffer.readUInt32LE(localPos) === 0x04034b50) {
      const localNameLen = buffer.readUInt16LE(localPos + 26);
      const localExtraLen = buffer.readUInt16LE(localPos + 28);
      const dataStart = localPos + 30 + localNameLen + localExtraLen;
      const rawData = buffer.slice(dataStart, dataStart + compressedSize);

      let data;
      if (compression === 0) {
        data = rawData;
      } else if (compression === 8) {
        try {
          data = zlib.inflateRawSync(rawData);
        } catch (e) {
          data = Buffer.alloc(0);
        }
      } else {
        data = Buffer.alloc(0);
      }

      entries.push({ name, data });
    }

    pos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * Extract text content from DOCX XML
 */
function extractTextFromXml(xml) {
  const parts = [];

  // Extract text from w:t elements
  const regex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/gi;
  let match;
  let lastWasParagraph = false;

  // Also track paragraph boundaries
  const lines = xml.split(/<\/w:p>/);
  for (const line of lines) {
    const texts = [];
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/gi;
    while ((match = tRegex.exec(line)) !== null) {
      texts.push(match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
    }
    if (texts.length > 0) {
      parts.push(texts.join(''));
    }
  }

  return parts.join('\n').trim();
}

/**
 * Extract text from .doc (old format) — basic fallback
 */
function extractDocText(filePath) {
  const buffer = fs.readFileSync(filePath);
  // Old .doc files have text embedded — try to extract ASCII/Unicode strings
  const text = [];
  let current = '';
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    // Printable ASCII range
    if (byte >= 32 && byte < 127) {
      current += String.fromCharCode(byte);
    } else if (byte === 10 || byte === 13) {
      if (current.length > 3) text.push(current);
      current = '';
    } else {
      if (current.length > 10) text.push(current);
      current = '';
    }
  }
  if (current.length > 3) text.push(current);

  // Filter out binary garbage — keep lines that look like real text
  const filtered = text.filter(line => {
    const words = line.split(/\s+/).length;
    return words >= 2 && line.length > 10 && /[a-zA-Z]{3,}/.test(line);
  });

  return filtered.join('\n');
}

module.exports = { extractText, extractDocText };
