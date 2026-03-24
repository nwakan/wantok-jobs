#!/usr/bin/env node
/**
 * Ranker Agent - Applicant Stack Ranking
 * Task: Task 18 - Smart Matching (Component 3)
 * Date: 2026-03-24
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../server/data/wantokjobs.db');
const db = new Database(dbPath);

class RankerAgent {
  calculateCombinedScore(matchScore, screeningScore, profileCompleteness) {
    const match = (matchScore || 0) * 0.5;        // 50% weight
    const screening = (screeningScore || 0) * 0.3; // 30% weight
    const profile = (profileCompleteness || 0) * 0.2; // 20% weight
    return match + screening + profile;
  }

  getRecommendedAction(combinedScore, hasRedFlags) {
    if (hasRedFlags) return 'review';
    if (combinedScore >= 0.8) return 'shortlist';
    if (combinedScore >= 0.6) return 'consider';
    if (combinedScore >= 0.4) return 'review';
    return 'reject';
  }

  async rankApplicants(jobId) {
    try {
      console.log(`[RankerAgent] Ranking applicants for job ${jobId}...`);

      const applicants = db.prepare(`
        SELECT 
          a.id as application_id,
          a.user_id,
          a.job_id,
          ass.match_score,
          ass.screening_score,
          ass.profile_completeness,
          ass.has_red_flags,
          a.created_at
        FROM applications a
        LEFT JOIN ai_assessments ass ON a.id = ass.application_id
        WHERE a.job_id = ?
        ORDER BY a.created_at DESC
      `).all(jobId);

      if (applicants.length === 0) {
        console.log(`[RankerAgent] No applicants found for job ${jobId}`);
        return [];
      }

      const ranked = applicants.map(app => {
        const combinedScore = this.calculateCombinedScore(
          app.match_score,
          app.screening_score,
          app.profile_completeness
        );
        const recommendedAction = this.getRecommendedAction(combinedScore, app.has_red_flags);
        
        return {
          ...app,
          combined_score: combinedScore,
          recommended_action: recommendedAction,
        };
      });

      ranked.sort((a, b) => b.combined_score - a.combined_score);

      ranked.forEach((app, index) => {
        app.rank_position = index + 1;
        app.rank_percentile = 1 - (index / ranked.length);
      });

      const upsertStmt = db.prepare(`
        INSERT INTO ai_assessments (
          application_id, job_id, user_id, match_score, match_breakdown,
          screening_score, profile_completeness, combined_score,
          rank_position, rank_percentile, recommended_action, has_red_flags
        ) VALUES (?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(application_id) DO UPDATE SET
          combined_score = excluded.combined_score,
          rank_position = excluded.rank_position,
          rank_percentile = excluded.rank_percentile,
          recommended_action = excluded.recommended_action,
          updated_at = CURRENT_TIMESTAMP
      `);

      ranked.forEach(app => {
        upsertStmt.run(
          app.application_id,
          app.job_id,
          app.user_id,
          app.match_score || 0,
          app.screening_score || 0,
          app.profile_completeness || 0,
          app.combined_score,
          app.rank_position,
          app.rank_percentile,
          app.recommended_action,
          app.has_red_flags ? 1 : 0
        );
      });

      console.log(`[RankerAgent] Ranked ${ranked.length} applicants for job ${jobId}`);
      return ranked;
    } catch (error) {
      console.error('[RankerAgent] Ranking error:', error);
      return [];
    }
  }

  generateShortlist(jobId, topN = 5) {
    try {
      const shortlist = db.prepare(`
        SELECT 
          a.id as application_id,
          a.user_id,
          u.name as applicant_name,
          ass.combined_score,
          ass.rank_position,
          ass.rank_percentile,
          ass.recommended_action
        FROM applications a
        JOIN ai_assessments ass ON a.id = ass.application_id
        JOIN users u ON a.user_id = u.id
        WHERE a.job_id = ? AND ass.recommended_action IN ('shortlist', 'consider')
        ORDER BY ass.rank_position ASC
        LIMIT ?
      `).all(jobId, topN);

      console.log(`[RankerAgent] Generated shortlist of ${shortlist.length} candidates for job ${jobId}`);
      return shortlist;
    } catch (error) {
      console.error('[RankerAgent] Shortlist error:', error);
      return [];
    }
  }

  autoShortlist(jobId) {
    try {
      const topCandidates = db.prepare(`
        SELECT a.id
        FROM applications a
        JOIN ai_assessments ass ON a.id = ass.application_id
        WHERE a.job_id = ? AND ass.recommended_action = 'shortlist'
        ORDER BY ass.rank_position ASC
        LIMIT 5
      `).all(jobId);

      if (topCandidates.length === 0) return 0;

      const updateStmt = db.prepare(`UPDATE applications SET status = 'shortlisted' WHERE id = ?`);
      const eventStmt = db.prepare(`
        INSERT INTO application_events (application_id, event_type, triggered_by)
        VALUES (?, 'shortlisted', 'ai')
      `);

      topCandidates.forEach(app => {
        updateStmt.run(app.id);
        eventStmt.run(app.id);
      });

      console.log(`[RankerAgent] Auto-shortlisted ${topCandidates.length} top candidates for job ${jobId}`);
      return topCandidates.length;
    } catch (error) {
      console.error('[RankerAgent] Auto-shortlist error:', error);
      return 0;
    }
  }
}

module.exports = new RankerAgent();
