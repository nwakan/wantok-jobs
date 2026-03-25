-- Migration 040: Add Foreign Key Constraint for jobs.employer_id
-- Prevents orphaned jobs and enforces data integrity
-- Created: 2026-03-26

-- Step 1: First, delete any existing orphaned jobs
-- (jobs with NULL or invalid employer_id)
DELETE FROM jobs
WHERE employer_id IS NULL
   OR employer_id NOT IN (SELECT id FROM users WHERE role IN ('employer', 'admin'));

-- Step 2: Add foreign key constraint
-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT for foreign keys
-- So we need to recreate the table

-- Create new jobs table with foreign key
CREATE TABLE jobs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  employer_id INTEGER NOT NULL,  -- NOT NULL enforced
  company_name TEXT,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'PGK',
  job_type TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  views INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  source TEXT,
  logo_url TEXT,
  is_featured INTEGER DEFAULT 0,
  featured_until TEXT,
  benefits TEXT,
  remote_work_option TEXT,
  experience_level TEXT,
  education_level TEXT,
  
  -- Foreign key constraint
  FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from old table (only valid jobs)
INSERT INTO jobs_new
SELECT *
FROM jobs
WHERE employer_id IS NOT NULL
  AND employer_id IN (SELECT id FROM users WHERE role IN ('employer', 'admin'));

-- Drop old table
DROP TABLE jobs;

-- Rename new table
ALTER TABLE jobs_new RENAME TO jobs;

-- Recreate indexes
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_expires_at ON jobs(expires_at);
CREATE INDEX idx_jobs_featured ON jobs(is_featured, featured_until);

-- Verify foreign key is enabled
PRAGMA foreign_keys = ON;

-- Test query: Count remaining jobs
SELECT 
  COUNT(*) as total_jobs,
  COUNT(DISTINCT employer_id) as unique_employers
FROM jobs;
