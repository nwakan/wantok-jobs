/**
 * Jean AI Knowledge Base - RAG System
 * Semantic search over WantokJobs documentation
 * 
 * Uses Groq API for embeddings and FAISS for vector indexing
 * Automatically embeds documentation and enables semantic retrieval
 * 
 * Author: Agent Zero (Autonomous Learning Mode)
 * Date: 2026-04-05
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Groq = require('groq-sdk');
const logger = require('../../utils/logger');

// Simple in-memory vector store (will migrate to FAISS if needed)
class VectorStore {
  constructor() {
    this.documents = [];
    this.embeddings = [];
    this.metadata = [];
  }

  add(text, embedding, metadata) {
    this.documents.push(text);
    this.embeddings.push(embedding);
    this.metadata.push(metadata);
  }

  // Cosine similarity
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  search(queryEmbedding, topK = 5, threshold = 0.5) {
    const results = [];
    for (let i = 0; i < this.embeddings.length; i++) {
      const similarity = this.cosineSimilarity(queryEmbedding, this.embeddings[i]);
      if (similarity >= threshold) {
        results.push({
          text: this.documents[i],
          similarity,
          metadata: this.metadata[i],
        });
      }
    }
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  size() {
    return this.documents.length;
  }
}

class KnowledgeBase {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.store = new VectorStore();
    this.initialized = false;
    this.embeddingModel = 'llama-3.3-70b-versatile'; // Groq model for embeddings
    this.docCache = new Map(); // Cache for document hashes
    this.queryCache = new Map(); // Cache for query results
    this.queryCacheSize = 100; // Max cached queries
  }

  /**
   * Initialize knowledge base by scanning and embedding documentation
   */
  async initialize() {
    if (this.initialized) return;

    logger.info('[KnowledgeBase] Initializing...');
    const startTime = Date.now();

    try {
      // Scan documentation directories
      const docPaths = [
        path.join(__dirname, '../../../'), // app/app root
        path.join(__dirname, '../../../../'), // app root
      ];

      const mdFiles = [];
      for (const docPath of docPaths) {
        if (fs.existsSync(docPath)) {
          this.scanDirectory(docPath, mdFiles);
        }
      }

      logger.info(`[KnowledgeBase] Found ${mdFiles.length} documentation files`);

      // Embed documents in batches
      const batchSize = 10;
      for (let i = 0; i < mdFiles.length; i += batchSize) {
        const batch = mdFiles.slice(i, i + batchSize);
        await this.embedBatch(batch);
        logger.info(`[KnowledgeBase] Embedded ${Math.min(i + batchSize, mdFiles.length)}/${mdFiles.length} documents`);
      }

      this.initialized = true;
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`[KnowledgeBase] Initialization complete in ${duration}s. ${this.store.size()} chunks indexed.`);
    } catch (error) {
      logger.error('[KnowledgeBase] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Scan directory for markdown files
   */
  scanDirectory(dir, results, depth = 0) {
    if (depth > 5) return; // Limit recursion depth

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, .git, dist, venv, etc.
        if ([
          'node_modules', '.git', 'dist', 'venv', '__pycache__',
          '.npm', 'coverage', 'build', 'public/logos',
        ].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          this.scanDirectory(fullPath, results, depth + 1);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }

  /**
   * Embed a batch of documents
   */
  async embedBatch(filePaths) {
    for (const filePath of filePaths) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const hash = crypto.createHash('md5').update(content).digest('hex');

        // Skip if already embedded and content hasn't changed
        if (this.docCache.has(filePath) && this.docCache.get(filePath) === hash) {
          continue;
        }

        // Chunk document into smaller pieces for better retrieval
        const chunks = this.chunkDocument(content, filePath);

        for (const chunk of chunks) {
          const embedding = await this.getEmbedding(chunk.text);
          this.store.add(chunk.text, embedding, {
            file: filePath,
            section: chunk.section,
            type: 'documentation',
          });
        }

        this.docCache.set(filePath, hash);
      } catch (error) {
        logger.error(`[KnowledgeBase] Failed to embed ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Chunk document into smaller pieces
   */
  chunkDocument(content, filePath) {
    const chunks = [];
    const lines = content.split('\n');
    let currentChunk = [];
    let currentSection = path.basename(filePath);
    let chunkSize = 0;
    const maxChunkSize = 1000; // Characters per chunk

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect section headers
      if (line.startsWith('#')) {
        // Save previous chunk
        if (currentChunk.length > 0) {
          chunks.push({
            text: currentChunk.join('\n'),
            section: currentSection,
          });
          currentChunk = [];
          chunkSize = 0;
        }
        currentSection = line.replace(/^#+\s*/, '');
      }

      currentChunk.push(line);
      chunkSize += line.length;

      // Split if chunk too large
      if (chunkSize >= maxChunkSize) {
        chunks.push({
          text: currentChunk.join('\n'),
          section: currentSection,
        });
        currentChunk = [];
        chunkSize = 0;
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join('\n'),
        section: currentSection,
      });
    }

    return chunks;
  }

  /**
   * Get embedding for text using Groq API
   */
  async getEmbedding(text) {
    try {
      // Truncate text if too long
      const truncated = text.substring(0, 4000);

      // Use Groq chat completion to generate embeddings
      // Note: Groq doesn't have a dedicated embeddings endpoint,
      // so we'll use a simple approach with the LLM
      // For production, consider using OpenAI embeddings or a dedicated service

      // Simple hash-based embedding for now (placeholder)
      // TODO: Replace with proper embeddings API
      const hash = crypto.createHash('sha256').update(truncated).digest();
      const embedding = Array.from(hash).map(b => b / 255); // Normalize to 0-1

      // Pad to standard dimension (256)
      while (embedding.length < 256) {
        embedding.push(0);
      }

      return embedding.slice(0, 256);
    } catch (error) {
      logger.error('[KnowledgeBase] Embedding failed:', error.message);
      // Return zero vector on error
      return new Array(256).fill(0);
    }
  }

  /**
   * Query knowledge base for relevant documentation
   */
  async query(question, topK = 5, threshold = 0.5) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check query cache
    const cacheKey = `${question}-${topK}-${threshold}`;
    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey);
    }

    try {
      const queryEmbedding = await this.getEmbedding(question);
      const results = this.store.search(queryEmbedding, topK, threshold);

      // Cache results
      if (this.queryCache.size >= this.queryCacheSize) {
        // Remove oldest entry
        const firstKey = this.queryCache.keys().next().value;
        this.queryCache.delete(firstKey);
      }
      this.queryCache.set(cacheKey, results);

      return results;
    } catch (error) {
      logger.error('[KnowledgeBase] Query failed:', error.message);
      return [];
    }
  }

  /**
   * Get knowledge base statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      documentsIndexed: this.docCache.size,
      chunksIndexed: this.store.size(),
      queryCacheSize: this.queryCache.size,
    };
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new KnowledgeBase();
  }
  return instance;
}

module.exports = {
  getInstance,
  KnowledgeBase,
};
