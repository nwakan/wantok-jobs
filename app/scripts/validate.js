#!/usr/bin/env node
/**
 * Pre-deploy validation — catches errors BEFORE they hit production.
 * Run: node scripts/validate.js
 * Exit 0 = all clear, exit 1 = failures found
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const APP_ROOT = path.resolve(__dirname, '..');
const results = { passed: 0, failed: 0, warnings: 0, errors: [] };

function pass(msg) { results.passed++; console.log(`  ✅ ${msg}`); }
function fail(msg) { results.failed++; results.errors.push(msg); console.log(`  ❌ ${msg}`); }
function warn(msg) { results.warnings++; console.log(`  ⚠️  ${msg}`); }

// ═══════════════════════════════════════════════════════════════
// 1. SYNTAX CHECK — can every .js file parse?
// ═══════════════════════════════════════════════════════════════
console.log('\n🔍 1. Syntax validation...');
const serverFiles = [];
function collectJS(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
      collectJS(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      serverFiles.push(full);
    }
  }
}
collectJS(path.join(APP_ROOT, 'server'));
collectJS(path.join(APP_ROOT, 'scripts'));

let syntaxErrors = 0;
for (const file of serverFiles) {
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
  } catch (e) {
    syntaxErrors++;
    const rel = path.relative(APP_ROOT, file);
    fail(`Syntax error in ${rel}: ${e.stderr?.toString().split('\n')[0] || 'unknown'}`);
  }
}
if (syntaxErrors === 0) pass(`All ${serverFiles.length} server files parse OK`);

// ═══════════════════════════════════════════════════════════════
// 2. MODULE RESOLUTION — can server/index.js require everything?
// ═══════════════════════════════════════════════════════════════
console.log('\n🔍 2. Module resolution...');
try {
  // Dry-run require of index without starting the server
  const indexSrc = fs.readFileSync(path.join(APP_ROOT, 'server/index.js'), 'utf8');
  
  // Check all require() calls resolve
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  let match;
  const checked = new Set();
  while ((match = requireRegex.exec(indexSrc)) !== null) {
    const mod = match[1];
    if (checked.has(mod)) continue;
    checked.add(mod);
    
    if (mod.startsWith('.')) {
      // Relative require
      const resolved = path.resolve(path.join(APP_ROOT, 'server'), mod);
      const candidates = [resolved, resolved + '.js', resolved + '/index.js'];
      if (!candidates.some(c => fs.existsSync(c))) {
        fail(`index.js requires '${mod}' but file not found`);
      }
    } else {
      // npm module — skip Node.js built-ins
      const builtins = new Set(require('module').builtinModules.flatMap(m => [m, `node:${m}`]));
      if (!builtins.has(mod)) {
        const modPath = path.join(APP_ROOT, 'node_modules', mod);
        if (!fs.existsSync(modPath)) {
          fail(`Missing npm module: ${mod}`);
        }
      }
    }
  }
  pass('All index.js dependencies resolvable');
} catch (e) {
  fail(`Module resolution check failed: ${e.message}`);
}

// ═══════════════════════════════════════════════════════════════
// 3. COMMONJS CHECK — no ES6 import/export in server files
// ═══════════════════════════════════════════════════════════════
console.log('\n🔍 3. CommonJS compliance...');
let esmViolations = 0;
for (const file of serverFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip comments
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;
    // Check for ES module syntax
    if (/^import\s+/.test(line) || /^export\s+(default|const|function|class|let|var)\s/.test(line)) {
      const rel = path.relative(APP_ROOT, file);
      fail(`ES module syntax at ${rel}:${i + 1}: "${line.substring(0, 60)}"`);
      esmViolations++;
    }
  }
}
if (esmViolations === 0) pass('All server files use CommonJS');

// ═══════════════════════════════════════════════════════════════
// 4. DATABASE INTEGRITY
// ═══════════════════════════════════════════════════════════════
console.log('\n🔍 4. Database integrity...');
try {
  const Database = require(path.join(APP_ROOT, 'node_modules/better-sqlite3'));
  const dbPath = path.join(APP_ROOT, 'server/data/wantokjobs.db');
  
  if (!fs.existsSync(dbPath)) {
    fail('Database file not found');
  } else {
    const db = new Database(dbPath, { readonly: true });
    
    // Integrity check
    const integrity = db.pragma('integrity_check');
    if (integrity[0]?.integrity_check === 'ok') {
      pass('Database integrity check passed');
    } else {
      fail(`Database integrity: ${JSON.stringify(integrity)}`);
    }
    
    // Check critical tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    const required = ['users', 'jobs', 'applications', 'notifications', 'categories', 'profiles_jobseeker', 'profiles_employer'];
    for (const table of required) {
      if (tables.includes(table)) {
        // Check it's not empty (except applications which may legitimately be 0)
        const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
        if (count === 0 && !['applications', 'notifications'].includes(table)) {
          warn(`Table '${table}' is empty`);
        }
      } else {
        fail(`Required table '${table}' missing`);
      }
    }
    pass(`All ${required.length} critical tables present`);
    
    // Check WAL mode
    const journal = db.pragma('journal_mode');
    if (journal[0]?.journal_mode === 'wal') {
      pass('WAL mode enabled');
    } else {
      warn(`Journal mode is '${journal[0]?.journal_mode}', recommended: wal`);
    }
    
    // Check for data anomalies
    const activeJobs = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status='active'").get().c;
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    console.log(`  📊 ${activeJobs} active jobs, ${totalUsers} users`);
    
    db.close();
  }
} catch (e) {
  fail(`Database check failed: ${e.message}`);
}

// ═══════════════════════════════════════════════════════════════
// 5. ROUTE REGISTRATION — check all route files are loadable
// ═══════════════════════════════════════════════════════════════
console.log('\n🔍 5. Route files...');
const routeDir = path.join(APP_ROOT, 'server/routes');
if (fs.existsSync(routeDir)) {
  const routeFiles = fs.readdirSync(routeDir).filter(f => f.endsWith('.js'));
  let routeErrors = 0;
  for (const rf of routeFiles) {
    try {
      // Just check syntax, don't actually require (would need DB/express setup)
      execSync(`node --check "${path.join(routeDir, rf)}"`, { stdio: 'pipe' });
    } catch (e) {
      routeErrors++;
      fail(`Route file ${rf} has syntax errors`);
    }
  }
  if (routeErrors === 0) pass(`All ${routeFiles.length} route files valid`);
}

// ═══════════════════════════════════════════════════════════════
// 6. ENV / CONFIG CHECK
// ═══════════════════════════════════════════════════════════════
console.log('\n🔍 6. Configuration...');
const envPath = path.join(APP_ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('JWT_SECRET') && !envContent.includes('JWT_SECRET=your-')) {
    pass('JWT_SECRET configured');
  } else {
    warn('JWT_SECRET may not be properly set');
  }
} else {
  warn('.env file not found (OK if env vars set externally)');
}

// Check for hardcoded domains that should be configurable
console.log('\n🔍 7. Hardcoded values check...');
let hardcoded = 0;
for (const file of serverFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(APP_ROOT, file);
  
  // Check for hardcoded localhost in production code (not test files)
  if (!rel.includes('test') && !rel.includes('scripts/')) {
    if (content.includes("'http://localhost") && !content.includes('development')) {
      // Only flag if it's not in a dev-only conditional
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("'http://localhost") && !lines[i].includes('development') && !lines[i].includes('//')) {
          warn(`Hardcoded localhost at ${rel}:${i + 1}`);
          hardcoded++;
        }
      }
    }
  }
  
  // Check for hardcoded tolarai.com (should use env var)
  if (content.includes('tolarai.com') && !rel.includes('scripts/')) {
    warn(`Hardcoded 'tolarai.com' in ${rel}`);
    hardcoded++;
  }
}
if (hardcoded === 0) pass('No problematic hardcoded values found');

// ═══════════════════════════════════════════════════════════════
// 8. SECURITY QUICK SCAN
// ═══════════════════════════════════════════════════════════════
console.log('\n🔍 8. Security quick scan...');
let secIssues = 0;
for (const file of serverFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(APP_ROOT, file);
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for SQL injection via template literals
    if (line.includes('db.prepare(`') && (line.includes('${') || lines[i + 1]?.includes('${'))) {
      // Check if the interpolation is in the SQL string, not a param
      const nextLines = lines.slice(i, i + 3).join(' ');
      if (nextLines.includes('${') && nextLines.includes('db.prepare')) {
        warn(`Possible SQL interpolation at ${rel}:${i + 1}`);
        secIssues++;
      }
    }
    
    // Check for eval() — skip this file and test files
    if (/\beval\s*\(/.test(line) && !line.trim().startsWith('//') && !rel.includes('validate.js') && !rel.includes('test')) {
      fail(`eval() usage at ${rel}:${i + 1}`);
      secIssues++;
    }
  }
}
if (secIssues === 0) pass('No obvious security issues found');

// ═══════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`Results: ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings`);

if (results.failed > 0) {
  console.log('\n❌ VALIDATION FAILED — do not deploy!');
  console.log('Failures:');
  results.errors.forEach(e => console.log(`  • ${e}`));
  process.exit(1);
} else if (results.warnings > 0) {
  console.log('\n⚠️  Validation passed with warnings — review before deploying');
  process.exit(0);
} else {
  console.log('\n✅ All checks passed — safe to deploy');
  process.exit(0);
}
