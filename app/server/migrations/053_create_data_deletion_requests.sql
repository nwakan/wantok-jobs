-- Migration 053: Create data_deletion_requests table
-- Purpose: Track Facebook user data deletion requests (GDPR compliance)
-- Created: 2026-05-06
-- Facebook Platform Policy: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  facebook_user_id TEXT NOT NULL,
  confirmation_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  requested_at TEXT NOT NULL,
  completed_at TEXT,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_facebook_user_id ON data_deletion_requests(facebook_user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_confirmation_code ON data_deletion_requests(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
