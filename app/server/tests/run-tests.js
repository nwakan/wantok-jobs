#!/usr/bin/env node
/**
 * Pure Node.js Test Runner
 * Collects and runs all *.test.js files
 */
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function colorize(text, color) {
  return `${COLORS[color] || ''}${text}${COLORS.reset}`;
}

/**
 * Recursively find all *.test.js files
 */
function findTestFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Run a single test file
 */
async function runTestFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(colorize(`\n▶ ${relativePath}`, 'cyan'));
  
  try {
    const testModule = require(filePath);
    
    if (typeof testModule !== 'function') {
      throw new Error('Test file must export a function that receives helpers');
    }
    
    const helpers = require('./helpers');
    await testModule(helpers);
    
    return { success: true, file: relativePath };
  } catch (error) {
    console.log(colorize(`  ✗ FAILED`, 'red'));
    console.log(colorize(`    ${error.message}`, 'red'));
    if (error.stack) {
      const stack = error.stack.split('\n').slice(1, 4).join('\n');
      console.log(colorize(stack, 'dim'));
    }
    return { success: false, file: relativePath, error };
  }
}

/**
 * Main test runner
 */
async function main() {
  const startTime = Date.now();
  console.log(colorize('╔════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║   WantokJobs Test Suite (Pure Node)   ║', 'cyan'));
  console.log(colorize('╚════════════════════════════════════════╝', 'cyan'));
  
  const testsDir = __dirname;
  const testFiles = findTestFiles(testsDir).filter(f => !f.includes('run-tests.js') && !f.includes('helpers.js'));
  
  if (testFiles.length === 0) {
    console.log(colorize('\n⚠ No test files found', 'yellow'));
    process.exit(0);
  }
  
  console.log(colorize(`\nFound ${testFiles.length} test file(s)\n`, 'dim'));
  
  const results = [];
  for (const file of testFiles) {
    const result = await runTestFile(file);
    results.push(result);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(colorize('\n═══════════════════════════════════════', 'cyan'));
  console.log(colorize(`  Test Results`, 'cyan'));
  console.log(colorize('═══════════════════════════════════════', 'cyan'));
  console.log(colorize(`  ✓ Passed: ${passed}`, 'green'));
  console.log(colorize(`  ✗ Failed: ${failed}`, failed > 0 ? 'red' : 'dim'));
  console.log(colorize(`  ⏱ Duration: ${duration}s`, 'dim'));
  console.log(colorize('═══════════════════════════════════════\n', 'cyan'));
  
  if (failed > 0) {
    console.log(colorize('Failed tests:', 'red'));
    results.filter(r => !r.success).forEach(r => {
      console.log(colorize(`  • ${r.file}`, 'red'));
    });
    console.log('');
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error(colorize('\n✗ Test runner crashed:', 'red'), err);
    process.exit(1);
  });
}

module.exports = { findTestFiles, runTestFile };
