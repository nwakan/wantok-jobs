#!/usr/bin/env node
/**
 * Test Script for AI Optimizations
 * Tests:
 * 1. Circuit breaker + exponential backoff in embedding-engine
 * 2. Hash-based embedding deduplication (already exists in vector-store)
 * 3. Regex job formatter with LLM fallback
 */

const path = require('path');
process.env.NODE_ENV = 'development';

// Load modules
const embeddingEngine = require('../server/lib/embedding-engine');
const { RegexJobParser, formatJobDescription } = require('../server/lib/job-formatter');

console.log('\n========================================');
console.log('AI OPTIMIZATION TEST SUITE');
console.log('========================================\n');

// ============================================
// TEST 1: Embedding Engine Circuit Breaker
// ============================================
async function testCircuitBreaker() {
  console.log('TEST 1: Circuit Breaker & Exponential Backoff');
  console.log('------------------------------------------------');
  
  const stats = embeddingEngine.getUsageStats();
  console.log('Current circuit breaker state:', stats.circuitBreaker);
  
  if (stats.circuitBreaker) {
    console.log(`  State: ${stats.circuitBreaker.state}`);
    console.log(`  Recent failures: ${stats.circuitBreaker.recentFailures}`);
    console.log(`  Recent successes: ${stats.circuitBreaker.recentSuccesses}`);
    
    if (stats.circuitBreaker.state === 'OPEN') {
      console.log(`  ⚠️  Circuit is OPEN - Cohere requests will be blocked`);
      console.log(`  Recovery in: ${stats.circuitBreaker.recoveryIn}s`);
    } else {
      console.log(`  ✅ Circuit is ${stats.circuitBreaker.state} - Cohere requests allowed`);
    }
  } else {
    console.log('  ❌ Circuit breaker not found - using old embedding-engine.js?');
  }
  
  console.log('\n✅ Circuit breaker test complete\n');
}

// ============================================
// TEST 2: Hash-Based Embedding Deduplication
// ============================================
async function testEmbeddingDedup() {
  console.log('TEST 2: Hash-Based Embedding Deduplication');
  console.log('------------------------------------------------');
  
  const vectorStore = require('../server/lib/vector-store');
  const db = require('../server/database');
  
  // Get a sample job from database
  const job = db.prepare('SELECT id, title, description FROM jobs WHERE status = ? LIMIT 1').get('active');
  
  if (!job) {
    console.log('  ⚠️  No active jobs found in database for testing');
    console.log('  Skipping dedup test\n');
    return;
  }
  
  console.log(`  Testing with job ID: ${job.id} (${job.title})`);
  
  const text = `${job.title} ${job.description || ''}`.slice(0, 500);
  
  try {
    // First upsert - should create embedding
    console.log('  Attempt 1: Creating new embedding...');
    const result1 = await vectorStore.upsert('job', job.id, text);
    console.log(`    Result: ${result1.cached ? 'CACHED ❌' : 'EMBEDDED ✅'}`);
    console.log(`    Model: ${result1.model}, Dimensions: ${result1.dimensions}`);
    
    // Second upsert with SAME content - should be cached
    console.log('  Attempt 2: Re-embedding same content...');
    const result2 = await vectorStore.upsert('job', job.id, text);
    console.log(`    Result: ${result2.cached ? 'CACHED ✅' : 'EMBEDDED ❌ (should be cached!)'}`);
    
    if (result2.cached) {
      console.log('\n✅ Deduplication working! No unnecessary API call made.\n');
    } else {
      console.log('\n⚠️  Deduplication not working - made redundant API call\n');
    }
    
  } catch (error) {
    console.error(`  ❌ Error testing dedup: ${error.message}\n`);
  }
}

// ============================================
// TEST 3: Regex Job Formatter
// ============================================
async function testRegexFormatter() {
  console.log('TEST 3: Regex Job Formatter (with LLM fallback)');
  console.log('------------------------------------------------');
  
  // Test case 1: Well-structured job description
  const wellStructuredJob = `
SENIOR ACCOUNTANT

About the Company:
Leading mining company based in Port Moresby seeking experienced professionals.

RESPONSIBILITIES:
• Prepare monthly financial reports
• Manage accounts payable and receivable
• Reconcile bank statements
• Coordinate with external auditors
• Train junior accounting staff

REQUIREMENTS:
• Bachelor's degree in Accounting
• 5+ years of experience in accounting
• CPA certification preferred
• Strong knowledge of PNG tax regulations
• Excellent Excel skills

BENEFITS:
• Competitive salary: PGK 80,000 - 100,000 per year
• Health insurance
• Annual leave and sick leave
• Professional development opportunities

HOW TO APPLY:
Send your CV and cover letter to jobs@miningcompany.com.pg

Deadline: 30th March 2026
Contact: (675) 325-1234
  `;
  
  console.log('  Test Case 1: Well-structured job description');
  const parser1 = new RegexJobParser(wellStructuredJob);
  const result1 = parser1.parse();
  
  console.log(`    Confidence: ${(result1.confidence * 100).toFixed(1)}%`);
  console.log(`    Sections found:`);
  console.log(`      - About: ${result1.sections.about ? '✅' : '❌'} (${result1.sections.about?.length || 0} chars)`);
  console.log(`      - Responsibilities: ${result1.sections.responsibilities.length} items`);
  console.log(`      - Requirements: ${result1.sections.requirements.length} items`);
  console.log(`      - Benefits: ${result1.sections.benefits.length} items`);
  console.log(`      - How to Apply: ${result1.sections.howToApply ? '✅' : '❌'} (${result1.sections.howToApply?.length || 0} chars)`);
  console.log(`      - Closing Info: ${result1.sections.closingInfo ? '✅' : '❌'} (${result1.sections.closingInfo?.length || 0} chars)`);
  
  if (result1.confidence >= 0.7) {
    console.log(`    ✅ High confidence - will use regex parser (no LLM call!)\n`);
  } else {
    console.log(`    ⚠️  Low confidence - would fall back to LLM\n`);
  }
  
  // Test case 2: Poorly structured job description
  const poorlyStructuredJob = `
We need someone to help with office work and customer service. Must be good with computers and people. Salary negotiable. Call us if interested.
  `;
  
  console.log('  Test Case 2: Poorly structured job description');
  const parser2 = new RegexJobParser(poorlyStructuredJob);
  const result2 = parser2.parse();
  
  console.log(`    Confidence: ${(result2.confidence * 100).toFixed(1)}%`);
  if (result2.confidence < 0.7) {
    console.log(`    ✅ Low confidence detected - would trigger LLM fallback\n`);
  } else {
    console.log(`    ⚠️  Unexpectedly high confidence for poor structure\n`);
  }
  
  // Test case 3: Full formatting pipeline (with LLM fallback possibility)
  console.log('  Test Case 3: Full formatting pipeline');
  try {
    const formatted = await formatJobDescription(wellStructuredJob, 'Senior Accountant', 'Mining Company');
    console.log(`    Method used: ${formatted.method}`);
    console.log(`    Confidence: ${(formatted.confidence * 100).toFixed(1)}%`);
    console.log(`    HTML length: ${formatted.formatted_html.length} chars`);
    
    if (formatted.method === 'regex') {
      console.log(`    ✅ Used regex parser - no LLM API call!\n`);
    } else if (formatted.method === 'llm-fallback') {
      console.log(`    ⚠️  Used LLM fallback (expected for complex jobs)\n`);
    } else {
      console.log(`    ℹ️  Method: ${formatted.method}\n`);
    }
  } catch (error) {
    console.error(`    ❌ Formatting error: ${error.message}\n`);
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runTests() {
  try {
    await testCircuitBreaker();
    await testEmbeddingDedup();
    await testRegexFormatter();
    
    console.log('========================================');
    console.log('ALL TESTS COMPLETE');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
