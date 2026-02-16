const Database = require('./app/node_modules/better-sqlite3');
const db = new Database('./app/server/data/wantokjobs.db');

console.log('Running quality pass on all jobs...\n');

// Get all jobs
const jobs = db.prepare('SELECT id, title, experience_level, company_name FROM jobs').all();

console.log(`Found ${jobs.length} total jobs`);

// Prepare update statement
const updateJob = db.prepare('UPDATE jobs SET title = ?, experience_level = ?, updated_at = datetime(\'now\') WHERE id = ?');

let updatedTitles = 0;
let updatedExperience = 0;

jobs.forEach(job => {
  let newTitle = job.title;
  let newExperience = job.experience_level;
  let changed = false;
  
  // Clean titles
  // Remove common suffixes/prefixes
  newTitle = newTitle
    .replace(/^\s*(URGENT|HOT|NEW)\s*[-:]\s*/i, '')
    .replace(/\s*[-–]\s*(URGENT|HOT|NEW)\s*$/i, '')
    .replace(/^\s*\d+\s*x\s*/i, '') // "2 x Manager" -> "Manager"
    .replace(/\s*\(.*?BASED\)$/i, '') // "(POM BASED)"
    .trim();
  
  // Fix casing for ALL CAPS titles
  if (newTitle === newTitle.toUpperCase() && newTitle.length > 10) {
    newTitle = newTitle.split(' ').map(word => {
      // Keep acronyms
      if (word.length <= 3 && /^[A-Z]+$/.test(word)) return word;
      // Keep specific terms
      if (['CEO', 'CFO', 'HR', 'IT', 'ICT', 'PNG', 'NCD', 'NGO'].includes(word)) return word;
      // Title case
      return word.charAt(0) + word.slice(1).toLowerCase();
    }).join(' ');
  }
  
  if (newTitle !== job.title) {
    changed = true;
    updatedTitles++;
  }
  
  // Normalize experience levels
  const expMap = {
    'entry level': 'Entry Level',
    'entry-level': 'Entry Level',
    'junior': 'Entry Level',
    'mid level': 'Mid Level',
    'mid-level': 'Mid Level',
    'intermediate': 'Mid Level',
    'senior': 'Senior Level',
    'senior level': 'Senior Level',
    'senior-level': 'Senior Level',
    'executive': 'Executive Level',
    'manager': 'Mid Level',
    'director': 'Senior Level',
  };
  
  if (newExperience) {
    const normalized = expMap[newExperience.toLowerCase()];
    if (normalized && normalized !== newExperience) {
      newExperience = normalized;
      changed = true;
      updatedExperience++;
    }
  } else {
    // Infer from title
    const titleLower = newTitle.toLowerCase();
    if (titleLower.includes('senior') || titleLower.includes('manager') || titleLower.includes('head')) {
      newExperience = 'Senior Level';
      changed = true;
      updatedExperience++;
    } else if (titleLower.includes('junior') || titleLower.includes('assistant') || titleLower.includes('intern')) {
      newExperience = 'Entry Level';
      changed = true;
      updatedExperience++;
    } else if (titleLower.includes('ceo') || titleLower.includes('chief') || titleLower.includes('director') || titleLower.includes('executive')) {
      newExperience = 'Executive Level';
      changed = true;
      updatedExperience++;
    } else if (!newExperience) {
      newExperience = 'Mid Level';
      changed = true;
      updatedExperience++;
    }
  }
  
  if (changed) {
    updateJob.run(newTitle, newExperience, job.id);
  }
});

console.log(`\nQuality pass complete:`);
console.log(`- Titles cleaned: ${updatedTitles}`);
console.log(`- Experience levels normalized: ${updatedExperience}`);

// Rebuild FTS
console.log('\nRebuilding full-text search index...');
try {
  db.prepare("INSERT INTO jobs_fts(jobs_fts) VALUES('rebuild')").run();
  console.log('FTS index rebuilt successfully');
} catch (error) {
  console.error('Error rebuilding FTS:', error.message);
}

// Get final counts by source
console.log('\n=== FINAL JOB COUNTS BY SOURCE ===');
const counts = db.prepare('SELECT source, COUNT(*) as count FROM jobs GROUP BY source ORDER BY count DESC').all();
counts.forEach(row => {
  console.log(`${row.source.padEnd(35)} ${row.count}`);
});

console.log(`\nTOTAL JOBS: ${jobs.length}`);

db.close();
