const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'wantokjobs.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('\n=== Migration 057: Application Deadline ===\n');

  // Step 1: Add application_deadline column to jobs table
  console.log('Step 1: Adding application_deadline column to jobs table...');
  db.run(`
    ALTER TABLE jobs ADD COLUMN application_deadline TEXT;
  `, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ Column application_deadline already exists, skipping...');
      } else {
        console.error('❌ Error adding application_deadline column:', err.message);
        throw err;
      }
    } else {
      console.log('✅ Added application_deadline column to jobs table');
    }
  });

  // Step 2: Create index on application_deadline for query performance
  console.log('\nStep 2: Creating index on application_deadline...');
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_jobs_application_deadline ON jobs(application_deadline);
  `, (err) => {
    if (err) {
      console.error('❌ Error creating index:', err.message);
      throw err;
    } else {
      console.log('✅ Created index idx_jobs_application_deadline');
    }
  });

  // Step 3: Verify migration
  console.log('\nStep 3: Verifying migration...');
  db.all(`PRAGMA table_info(jobs);`, (err, rows) => {
    if (err) {
      console.error('❌ Error verifying migration:', err.message);
      throw err;
    }

    const applicationDeadlineColumn = rows.find(row => row.name === 'application_deadline');
    if (applicationDeadlineColumn) {
      console.log('✅ Migration verified: application_deadline column exists at position', applicationDeadlineColumn.cid);
      console.log('   Column type:', applicationDeadlineColumn.type);
      console.log('   Nullable:', applicationDeadlineColumn.notnull === 0);
    } else {
      console.error('❌ Migration verification failed: application_deadline column not found');
      throw new Error('Migration verification failed');
    }
  });

  // Step 4: Verify index
  console.log('\nStep 4: Verifying index...');
  db.all(`
    SELECT name FROM sqlite_master 
    WHERE type='index' AND name='idx_jobs_application_deadline';
  `, (err, rows) => {
    if (err) {
      console.error('❌ Error verifying index:', err.message);
      throw err;
    }

    if (rows.length > 0) {
      console.log('✅ Index verification successful: idx_jobs_application_deadline exists');
    } else {
      console.error('❌ Index verification failed: idx_jobs_application_deadline not found');
      throw new Error('Index verification failed');
    }

    console.log('\n=== Migration 057 Complete ===\n');
    db.close();
  });
});
