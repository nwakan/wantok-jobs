-- Migration 048: Jean AI Chat Tables
-- Creates tables for Jean AI chat persistence and conversation management
-- Date: 2026-04-01
-- Author: Agent Zero

-- Jean AI Sessions Table
-- Stores chat sessions with user association and flow state
CREATE TABLE IF NOT EXISTS jean_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_token TEXT UNIQUE NOT NULL,
  current_flow TEXT,           -- Active conversation flow (e.g., 'job-search', 'profile-update')
  flow_state TEXT,             -- JSON state for multi-step flows
  platform TEXT DEFAULT 'web', -- Source: 'web', 'whatsapp', 'mobile'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Jean AI Messages Table
-- Stores conversation history with metadata
CREATE TABLE IF NOT EXISTS jean_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL,          -- 'user' or 'assistant'
  content TEXT NOT NULL,       -- Message text
  intent TEXT,                 -- Classified intent (e.g., 'search_jobs', 'apply_job')
  confidence REAL,             -- Intent classification confidence (0.0-1.0)
  metadata TEXT,               -- JSON metadata (tokens, model, response time, etc.)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES jean_sessions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jean_sessions_user_id ON jean_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_jean_sessions_token ON jean_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_jean_sessions_updated ON jean_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jean_messages_session ON jean_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_jean_messages_created ON jean_messages(created_at DESC);

-- Triggers for updated_at timestamp
CREATE TRIGGER IF NOT EXISTS jean_sessions_updated_at
AFTER UPDATE ON jean_sessions
FOR EACH ROW
BEGIN
  UPDATE jean_sessions SET updated_at = datetime('now') WHERE id = NEW.id;
END;
