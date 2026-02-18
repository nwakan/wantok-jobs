/**
 * Vector Store — SQLite-based vector storage for semantic search
 * 
 * Stores embeddings and provides similarity search capabilities
 */

const db = require('../database');
const { embed, cosineSimilarity, vectorToBuffer, bufferToVector, textHash } = require('./embedding-engine');
const { expand } = require('./tok-pisin');

// Initialize embeddings table
function initializeTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      text_hash TEXT NOT NULL,
      vector BLOB NOT NULL,
      dimensions INTEGER NOT NULL,
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(entity_type, entity_id)
    )
  `);
  
  // Create index for faster lookups
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_type, entity_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_embeddings_hash ON embeddings(text_hash)`);
  } catch (e) {
    // Indexes might already exist
  }
}

// Initialize on module load
initializeTable();

/**
 * Upsert a single entity embedding
 * 
 * @param {string} entityType - Type of entity (e.g., 'job', 'profile')
 * @param {number} entityId - Entity ID
 * @param {string} text - Text to embed
 * @param {string} inputType - 'search_document' for indexing, 'search_query' for queries
 * @returns {Promise<{id: number, dimensions: number, model: string}>}
 */
async function upsert(entityType, entityId, text, inputType = 'search_document') {
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required');
  }
  
  // Expand Tok Pisin terms
  const expandedText = expand(text);
  const hash = textHash(expandedText);
  
  // Check if already embedded with same text
  const existing = db.prepare(`
    SELECT id, text_hash, dimensions, model FROM embeddings
    WHERE entity_type = ? AND entity_id = ?
  `).get(entityType, entityId);
  
  if (existing && existing.text_hash === hash) {
    // Text unchanged, skip re-embedding
    return {
      id: existing.id,
      dimensions: existing.dimensions,
      model: existing.model,
      cached: true
    };
  }
  
  // Generate embedding
  const result = await embed(expandedText, inputType);
  const vector = result.vectors[0];
  const vectorBuffer = vectorToBuffer(vector);
  
  // Upsert into database
  if (existing) {
    db.prepare(`
      UPDATE embeddings 
      SET vector = ?, dimensions = ?, model = ?, provider = ?, text_hash = ?, updated_at = datetime('now')
      WHERE entity_type = ? AND entity_id = ?
    `).run(vectorBuffer, result.dimensions, result.model, result.provider, hash, entityType, entityId);
    
    return {
      id: existing.id,
      dimensions: result.dimensions,
      model: result.model,
      provider: result.provider,
      cached: false
    };
  } else {
    const insertResult = db.prepare(`
      INSERT INTO embeddings (entity_type, entity_id, vector, dimensions, model, provider, text_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(entityType, entityId, vectorBuffer, result.dimensions, result.model, result.provider, hash);
    
    return {
      id: insertResult.lastInsertRowid,
      dimensions: result.dimensions,
      model: result.model,
      provider: result.provider,
      cached: false
    };
  }
}

/**
 * Batch upsert multiple entity embeddings
 * 
 * @param {Array<{entityType: string, entityId: number, text: string}>} items
 * @returns {Promise<{processed: number, cached: number, errors: number}>}
 */
async function batchUpsert(items) {
  const stats = { processed: 0, cached: 0, errors: 0 };
  
  for (const item of items) {
    try {
      const result = await upsert(item.entityType, item.entityId, item.text);
      stats.processed++;
      if (result.cached) stats.cached++;
    } catch (e) {
      console.error(`Vector Store: Failed to embed ${item.entityType} ${item.entityId}:`, e.message);
      stats.errors++;
    }
  }
  
  return stats;
}

/**
 * Search for similar entities using semantic similarity
 * 
 * @param {string} queryText - Search query
 * @param {string} entityType - Entity type to search (e.g., 'job', 'profile')
 * @param {number} limit - Max results to return
 * @param {number} minScore - Minimum similarity score (0-1)
 * @returns {Promise<Array<{entity_id: number, score: number}>>}
 */
async function search(queryText, entityType, limit = 20, minScore = 0.5) {
  if (!queryText || typeof queryText !== 'string') {
    throw new Error('Query text is required');
  }
  
  // Expand Tok Pisin terms in query
  const expandedQuery = expand(queryText);
  
  // Generate query embedding
  const result = await embed(expandedQuery, 'search_query');
  const queryVector = result.vectors[0];
  const queryDimensions = result.dimensions;
  
  // Get all embeddings of this type
  const embeddings = db.prepare(`
    SELECT entity_id, vector, dimensions, model
    FROM embeddings
    WHERE entity_type = ?
  `).all(entityType);
  
  if (embeddings.length === 0) {
    return [];
  }
  
  // Compute similarity scores
  const scores = [];
  
  for (const embedding of embeddings) {
    // Skip if dimensions don't match (different models)
    if (embedding.dimensions !== queryDimensions) {
      continue;
    }
    
    const vector = bufferToVector(embedding.vector);
    const score = cosineSimilarity(queryVector, vector);
    
    if (score >= minScore) {
      scores.push({
        entity_id: embedding.entity_id,
        score: score,
        model: embedding.model
      });
    }
  }
  
  // Sort by score descending and limit
  scores.sort((a, b) => b.score - a.score);
  
  return scores.slice(0, limit);
}

/**
 * Get stored vector for an entity
 * 
 * @param {string} entityType
 * @param {number} entityId
 * @returns {Array<number>|null}
 */
function getVector(entityType, entityId) {
  const row = db.prepare(`
    SELECT vector, dimensions FROM embeddings
    WHERE entity_type = ? AND entity_id = ?
  `).get(entityType, entityId);
  
  if (!row) return null;
  
  return bufferToVector(row.vector);
}

/**
 * Delete a stored vector
 * 
 * @param {string} entityType
 * @param {number} entityId
 * @returns {boolean}
 */
function deleteVector(entityType, entityId) {
  const result = db.prepare(`
    DELETE FROM embeddings
    WHERE entity_type = ? AND entity_id = ?
  `).run(entityType, entityId);
  
  return result.changes > 0;
}

/**
 * Find similar entities to a given entity (using its stored vector)
 * 
 * @param {string} entityType - Entity type to search
 * @param {number} entityId - Entity to find similar to
 * @param {number} limit - Max results
 * @param {number} minScore - Minimum similarity score
 * @returns {Array<{entity_id: number, score: number}>}
 */
function findSimilar(entityType, entityId, limit = 10, minScore = 0.5) {
  const sourceVector = getVector(entityType, entityId);
  
  if (!sourceVector) {
    return [];
  }
  
  const sourceDimensions = sourceVector.length;
  
  // Get all other embeddings of this type
  const embeddings = db.prepare(`
    SELECT entity_id, vector, dimensions
    FROM embeddings
    WHERE entity_type = ? AND entity_id != ?
  `).all(entityType, entityId);
  
  if (embeddings.length === 0) {
    return [];
  }
  
  // Compute similarity scores
  const scores = [];
  
  for (const embedding of embeddings) {
    if (embedding.dimensions !== sourceDimensions) {
      continue;
    }
    
    const vector = bufferToVector(embedding.vector);
    const score = cosineSimilarity(sourceVector, vector);
    
    if (score >= minScore) {
      scores.push({
        entity_id: embedding.entity_id,
        score: score
      });
    }
  }
  
  // Sort by score descending and limit
  scores.sort((a, b) => b.score - a.score);
  
  return scores.slice(0, limit);
}

/**
 * Get statistics about stored embeddings
 */
function getStats() {
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM embeddings').get();
  const byType = db.prepare(`
    SELECT entity_type, COUNT(*) as count, model
    FROM embeddings
    GROUP BY entity_type, model
  `).all();
  
  const dimensionsRow = db.prepare(`
    SELECT AVG(dimensions) as avg_dimensions, MIN(dimensions) as min_dimensions, MAX(dimensions) as max_dimensions
    FROM embeddings
  `).get();
  
  return {
    total: totalRow.count,
    byType,
    dimensions: dimensionsRow
  };
}

/**
 * Clear all embeddings (use with caution)
 */
function clearAll() {
  db.prepare('DELETE FROM embeddings').run();
  return true;
}

/**
 * Clear embeddings for a specific entity type
 */
function clearType(entityType) {
  const result = db.prepare('DELETE FROM embeddings WHERE entity_type = ?').run(entityType);
  return result.changes;
}

module.exports = {
  upsert,
  batchUpsert,
  search,
  getVector,
  deleteVector,
  findSimilar,
  getStats,
  clearAll,
  clearType,
  initializeTable
};
