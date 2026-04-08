/**
 * Jean AI Resonant Memory Layer
 * Implements frequency-based memory encoding and multi-dimensional coherence scoring
 * 
 * Based on Resonant Machine Learning (RML), Artificial Resonant Intelligence (ARI),
 * and Machine Memory Intelligence (M2I) research
 * 
 * Author: Agent Zero (Autonomous Learning Mode)
 * Date: 2026-04-05
 */

const db = require('../../database');
const logger = require('../../utils/logger');

/**
 * Memory encoding with resonance scores
 * Stores memories with importance, recency, emotional weight, and cultural relevance
 */
class ResonantMemory {
  constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize database tables for resonant memory
   */
  initializeDatabase() {
    // Create resonant_memories table if it doesn't exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS resonant_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        memory_type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        importance REAL DEFAULT 0.5,
        recency_score REAL DEFAULT 1.0,
        emotional_weight REAL DEFAULT 0.0,
        cultural_relevance REAL DEFAULT 0.0,
        resonance_score REAL DEFAULT 0.5,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES jean_sessions(id) ON DELETE CASCADE
      )
    `).run();

    // Create response_coherence table for tracking response quality
    db.prepare(`
      CREATE TABLE IF NOT EXISTS response_coherence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        message_id INTEGER,
        factual_accuracy REAL DEFAULT 0.5,
        tonal_appropriateness REAL DEFAULT 0.5,
        cultural_alignment REAL DEFAULT 0.5,
        ethical_compliance REAL DEFAULT 0.5,
        context_relevance REAL DEFAULT 0.5,
        overall_coherence REAL DEFAULT 0.5,
        user_feedback INTEGER,
        task_completed BOOLEAN DEFAULT 0,
        sentiment TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES jean_sessions(id) ON DELETE CASCADE
      )
    `).run();

    // Create conversation_patterns table for learning successful patterns
    db.prepare(`
      CREATE TABLE IF NOT EXISTS conversation_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_type TEXT NOT NULL,
        intent TEXT,
        user_context TEXT,
        successful_response TEXT,
        success_rate REAL DEFAULT 0.5,
        usage_count INTEGER DEFAULT 1,
        avg_coherence REAL DEFAULT 0.5,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create memory_associations table for linking related memories
    db.prepare(`
      CREATE TABLE IF NOT EXISTS memory_associations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_id_1 INTEGER,
        memory_id_2 INTEGER,
        association_strength REAL DEFAULT 0.5,
        association_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (memory_id_1) REFERENCES resonant_memories(id) ON DELETE CASCADE,
        FOREIGN KEY (memory_id_2) REFERENCES resonant_memories(id) ON DELETE CASCADE
      )
    `).run();

    logger.info('[ResonantMemory] Database tables initialized');
  }

  /**
   * Store memory with resonance encoding
   */
  storeMemory(sessionId, memoryType, content, options = {}) {
    const {
      importance = 0.5,
      emotionalWeight = 0.0,
      culturalRelevance = 0.0,
      metadata = null,
    } = options;

    // Calculate resonance score
    const resonanceScore = this.calculateResonanceScore({
      importance,
      recencyScore: 1.0, // New memory has max recency
      emotionalWeight,
      culturalRelevance,
    });

    const result = db.prepare(`
      INSERT INTO resonant_memories (
        session_id, memory_type, content, importance, emotional_weight,
        cultural_relevance, resonance_score, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      memoryType,
      content,
      importance,
      emotionalWeight,
      culturalRelevance,
      resonanceScore,
      metadata ? JSON.stringify(metadata) : null
    );

    return result.lastInsertRowid;
  }

  /**
   * Calculate resonance score from multiple dimensions
   */
  calculateResonanceScore(dimensions) {
    const {
      importance = 0.5,
      recencyScore = 0.5,
      emotionalWeight = 0.0,
      culturalRelevance = 0.0,
    } = dimensions;

    // Weighted average with emphasis on importance and recency
    const weights = {
      importance: 0.4,
      recency: 0.3,
      emotional: 0.15,
      cultural: 0.15,
    };

    const score =
      importance * weights.importance +
      recencyScore * weights.recency +
      Math.abs(emotionalWeight) * weights.emotional +
      culturalRelevance * weights.cultural;

    return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
  }

  /**
   * Update memory recency scores based on time decay
   */
  updateRecencyScores() {
    // Time decay: memories lose 10% recency per day
    const decayRate = 0.1;
    const dayInMs = 24 * 60 * 60 * 1000;

    const memories = db.prepare(`
      SELECT id, created_at, updated_at, recency_score
      FROM resonant_memories
      WHERE recency_score > 0.1
    `).all();

    for (const memory of memories) {
      const ageInDays = (Date.now() - new Date(memory.updated_at).getTime()) / dayInMs;
      const newRecency = Math.max(0.1, memory.recency_score * Math.exp(-decayRate * ageInDays));

      db.prepare(`
        UPDATE resonant_memories
        SET recency_score = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newRecency, memory.id);
    }
  }

  /**
   * Track response coherence across multiple dimensions
   */
  trackResponseCoherence(sessionId, messageId, dimensions) {
    const {
      factualAccuracy = 0.5,
      tonalAppropriateness = 0.5,
      culturalAlignment = 0.5,
      ethicalCompliance = 0.5,
      contextRelevance = 0.5,
      userFeedback = null,
      taskCompleted = false,
      sentiment = null,
      metadata = null,
    } = dimensions;

    // Calculate overall coherence (weighted average)
    const overallCoherence =
      factualAccuracy * 0.25 +
      tonalAppropriateness * 0.2 +
      culturalAlignment * 0.2 +
      ethicalCompliance * 0.15 +
      contextRelevance * 0.2;

    db.prepare(`
      INSERT INTO response_coherence (
        session_id, message_id, factual_accuracy, tonal_appropriateness,
        cultural_alignment, ethical_compliance, context_relevance,
        overall_coherence, user_feedback, task_completed, sentiment, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      messageId,
      factualAccuracy,
      tonalAppropriateness,
      culturalAlignment,
      ethicalCompliance,
      contextRelevance,
      overallCoherence,
      userFeedback,
      taskCompleted ? 1 : 0,
      sentiment,
      metadata ? JSON.stringify(metadata) : null
    );
  }

  /**
   * Learn successful conversation patterns
   */
  learnPattern(patternType, intent, userContext, response, coherenceScore) {
    // Check if pattern exists
    const existing = db.prepare(`
      SELECT * FROM conversation_patterns
      WHERE pattern_type = ? AND intent = ? AND user_context = ?
    `).get(patternType, intent, userContext);

    if (existing) {
      // Update existing pattern
      const newUsageCount = existing.usage_count + 1;
      const newAvgCoherence =
        (existing.avg_coherence * existing.usage_count + coherenceScore) / newUsageCount;
      const newSuccessRate = newAvgCoherence > 0.7 ? newAvgCoherence : existing.success_rate;

      db.prepare(`
        UPDATE conversation_patterns
        SET usage_count = ?, avg_coherence = ?, success_rate = ?,
            successful_response = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newUsageCount, newAvgCoherence, newSuccessRate, response, existing.id);
    } else {
      // Create new pattern
      db.prepare(`
        INSERT INTO conversation_patterns (
          pattern_type, intent, user_context, successful_response,
          success_rate, avg_coherence
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(patternType, intent, userContext, response, coherenceScore, coherenceScore);
    }
  }

  /**
   * Get best response pattern for a given intent and context
   */
  getBestPattern(intent, userContext) {
    return db.prepare(`
      SELECT * FROM conversation_patterns
      WHERE intent = ? AND user_context = ?
      ORDER BY success_rate DESC, usage_count DESC
      LIMIT 1
    `).get(intent, userContext);
  }

  /**
   * Create association between related memories
   */
  associateMemories(memoryId1, memoryId2, associationType, strength = 0.5) {
    db.prepare(`
      INSERT INTO memory_associations (
        memory_id_1, memory_id_2, association_type, association_strength
      ) VALUES (?, ?, ?, ?)
    `).run(memoryId1, memoryId2, associationType, strength);
  }

  /**
   * Get associated memories for a given memory
   */
  getAssociatedMemories(memoryId, minStrength = 0.5) {
    return db.prepare(`
      SELECT rm.*, ma.association_strength, ma.association_type
      FROM resonant_memories rm
      JOIN memory_associations ma ON rm.id = ma.memory_id_2
      WHERE ma.memory_id_1 = ? AND ma.association_strength >= ?
      ORDER BY ma.association_strength DESC
    `).all(memoryId, minStrength);
  }

  /**
   * Get high-resonance memories (most important/recent)
   */
  getHighResonanceMemories(sessionId, limit = 10, minResonance = 0.6) {
    return db.prepare(`
      SELECT * FROM resonant_memories
      WHERE session_id = ? AND resonance_score >= ?
      ORDER BY resonance_score DESC, updated_at DESC
      LIMIT ?
    `).all(sessionId, minResonance, limit);
  }

  /**
   * Analyze conversation success signals
   */
  analyzeConversationSuccess(sessionId) {
    const coherence = db.prepare(`
      SELECT AVG(overall_coherence) as avg_coherence,
             AVG(factual_accuracy) as avg_accuracy,
             AVG(cultural_alignment) as avg_cultural,
             COUNT(*) as message_count,
             SUM(CASE WHEN task_completed = 1 THEN 1 ELSE 0 END) as tasks_completed
      FROM response_coherence
      WHERE session_id = ?
    `).get(sessionId);

    return {
      avgCoherence: coherence?.avg_coherence || 0.5,
      avgAccuracy: coherence?.avg_accuracy || 0.5,
      avgCultural: coherence?.avg_cultural || 0.5,
      messageCount: coherence?.message_count || 0,
      tasksCompleted: coherence?.tasks_completed || 0,
      successRate: coherence?.tasks_completed / Math.max(1, coherence?.message_count) || 0,
    };
  }

  /**
   * Get statistics about resonant memory system
   */
  getStats() {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_memories,
        AVG(resonance_score) as avg_resonance,
        AVG(importance) as avg_importance,
        AVG(recency_score) as avg_recency,
        MAX(resonance_score) as max_resonance,
        MIN(resonance_score) as min_resonance
      FROM resonant_memories
    `).get();

    const patterns = db.prepare(`
      SELECT COUNT(*) as total_patterns,
             AVG(success_rate) as avg_success_rate,
             SUM(usage_count) as total_usage
      FROM conversation_patterns
    `).get();

    const coherence = db.prepare(`
      SELECT AVG(overall_coherence) as avg_coherence,
             COUNT(*) as total_responses
      FROM response_coherence
    `).get();

    const associations = db.prepare(`
      SELECT COUNT(*) as total_associations,
             AVG(association_strength) as avg_strength
      FROM memory_associations
    `).get();

    return {
      memories: {
        total: stats?.total_memories || 0,
        avgResonance: stats?.avg_resonance || 0.5,
        avgImportance: stats?.avg_importance || 0.5,
        avgRecency: stats?.avg_recency || 0.5,
        maxResonance: stats?.max_resonance || 0,
        minResonance: stats?.min_resonance || 0,
      },
      patterns: {
        total: patterns?.total_patterns || 0,
        avgSuccessRate: patterns?.avg_success_rate || 0.5,
        totalUsage: patterns?.total_usage || 0,
      },
      coherence: {
        avgCoherence: coherence?.avg_coherence || 0.5,
        totalResponses: coherence?.total_responses || 0,
      },
      associations: {
        total: associations?.total_associations || 0,
        avgStrength: associations?.avg_strength || 0.5,
      },
    };
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new ResonantMemory();
  }
  return instance;
}

module.exports = {
  getInstance,
  ResonantMemory,
};
