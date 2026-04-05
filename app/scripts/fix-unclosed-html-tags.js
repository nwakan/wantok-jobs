/**
 * Fix Unclosed HTML Tags in Job Descriptions
 * 
 * Priority 5: Job Quality Improvements
 * Issue: 175 jobs (97.2% of HTML jobs) have unclosed HTML tags
 * Root Cause: Job scrapers cutting off descriptions mid-HTML
 * 
 * This script:
 * 1. Queries all jobs with HTML formatting
 * 2. Detects unclosed tags
 * 3. Auto-closes all open tags in reverse order (LIFO)
 * 4. Updates database
 * 5. Reports results
 */

const Database = require('better-sqlite3');
const path = require('path');

// HTML Tag Auto-Closer Function
function autoCloseHtmlTags(html) {
    if (!html || typeof html !== 'string') return html;
    
    // List of self-closing tags that don't need closing
    const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link'];
    
    // Track open tags
    const openTags = [];
    
    // Regular expression to match HTML tags
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
        const fullTag = match[0];
        const tagName = match[1].toLowerCase();
        
        // Skip self-closing tags
        if (selfClosing.includes(tagName)) continue;
        
        // Check if it's a closing tag
        if (fullTag.startsWith('</')) {
            // Remove from open tags if it matches the most recent
            if (openTags.length > 0 && openTags[openTags.length - 1] === tagName) {
                openTags.pop();
            }
        } else {
            // It's an opening tag
            openTags.push(tagName);
        }
    }
    
    // Close all remaining open tags in reverse order
    let result = html;
    while (openTags.length > 0) {
        const tagToClose = openTags.pop();
        result += `</${tagToClose}>`;
    }
    
    return result;
}

// Detect if HTML has unclosed tags
function hasUnclosedTags(html) {
    if (!html || typeof html !== 'string') return false;
    if (!html.includes('<') || !html.includes('>')) return false;
    
    const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link'];
    const openTags = [];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
        const fullTag = match[0];
        const tagName = match[1].toLowerCase();
        
        if (selfClosing.includes(tagName)) continue;
        
        if (fullTag.startsWith('</')) {
            if (openTags.length > 0 && openTags[openTags.length - 1] === tagName) {
                openTags.pop();
            }
        } else {
            openTags.push(tagName);
        }
    }
    
    return openTags.length > 0;
}

// Main execution
function main() {
    console.log('\n' + '='.repeat(70));
    console.log('Fix Unclosed HTML Tags in Job Descriptions');
    console.log('Priority 5: Job Quality Improvements');
    console.log('='.repeat(70) + '\n');
    
    // Connect to database
    const dbPath = path.join(__dirname, '../server/data/wantokjobs.db');
    console.log(`Connecting to database: ${dbPath}\n`);
    
    const db = new Database(dbPath);
    
    try {
        // Step 1: Query all jobs with HTML formatting
        console.log('Step 1: Querying jobs with HTML formatting...');
        
        const htmlJobs = db.prepare(`
            SELECT id, title, description
            FROM jobs
            WHERE description LIKE '%<%' AND description LIKE '%>%'
        `).all();
        
        console.log(`Found ${htmlJobs.length} jobs with HTML formatting\n`);
        
        // Step 2: Detect jobs with unclosed tags
        console.log('Step 2: Detecting unclosed tags...');
        
        const jobsToFix = htmlJobs.filter(job => hasUnclosedTags(job.description));
        
        console.log(`Found ${jobsToFix.length} jobs with unclosed tags`);
        console.log(`Percentage: ${((jobsToFix.length / htmlJobs.length) * 100).toFixed(1)}% of HTML jobs\n`);
        
        if (jobsToFix.length === 0) {
            console.log('✅ No jobs need fixing. Exiting.\n');
            db.close();
            return;
        }
        
        // Step 3: Preview first 3 fixes
        console.log('Step 3: Preview first 3 fixes...');
        console.log('-'.repeat(70));
        
        for (let i = 0; i < Math.min(3, jobsToFix.length); i++) {
            const job = jobsToFix[i];
            const fixed = autoCloseHtmlTags(job.description);
            
            console.log(`\nJob ID: ${job.id}`);
            console.log(`Title: ${job.title}`);
            console.log(`\nOriginal (${job.description.length} chars):`);
            console.log(job.description.substring(0, 200) + '...');
            console.log(`\nFixed (${fixed.length} chars):`);
            console.log(fixed.substring(0, 200) + '...');
            console.log(`\nAdded: ${fixed.length - job.description.length} chars`);
            console.log('-'.repeat(70));
        }
        
        // Step 4: Confirm before proceeding
        console.log(`\n⚠️  Ready to fix ${jobsToFix.length} jobs`);
        console.log('This will UPDATE the database with auto-closed HTML tags.\n');
        
        // In production, you might want to add a confirmation prompt here
        // For autonomous execution, we proceed directly
        
        // Step 5: Apply fixes
        console.log('Step 5: Applying fixes...');
        console.log('-'.repeat(70));
        
        const updateStmt = db.prepare('UPDATE jobs SET description = ? WHERE id = ?');
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        db.transaction(() => {
            for (const job of jobsToFix) {
                try {
                    const fixed = autoCloseHtmlTags(job.description);
                    updateStmt.run(fixed, job.id);
                    successCount++;
                    
                    if (successCount % 20 === 0) {
                        console.log(`  ✅ Fixed ${successCount}/${jobsToFix.length} jobs...`);
                    }
                } catch (error) {
                    errorCount++;
                    errors.push({ id: job.id, title: job.title, error: error.message });
                }
            }
        })();
        
        console.log(`  ✅ Fixed ${successCount}/${jobsToFix.length} jobs\n`);
        
        // Step 6: Report results
        console.log('Step 6: Final Results');
        console.log('='.repeat(70));
        console.log(`\nTotal HTML jobs: ${htmlJobs.length}`);
        console.log(`Jobs with unclosed tags: ${jobsToFix.length}`);
        console.log(`Successfully fixed: ${successCount}`);
        console.log(`Errors: ${errorCount}`);
        
        if (errorCount > 0) {
            console.log('\nErrors encountered:');
            errors.forEach(err => {
                console.log(`  - Job ${err.id} (${err.title}): ${err.error}`);
            });
        }
        
        // Step 7: Verify fixes
        console.log('\nStep 7: Verifying fixes...');
        
        const stillBroken = db.prepare(`
            SELECT id, title, description
            FROM jobs
            WHERE description LIKE '%<%' AND description LIKE '%>%'
        `).all().filter(job => hasUnclosedTags(job.description));
        
        console.log(`Jobs still with unclosed tags: ${stillBroken.length}`);
        
        if (stillBroken.length === 0) {
            console.log('\n✅ SUCCESS: All HTML jobs now have properly closed tags!\n');
        } else {
            console.log('\n⚠️  WARNING: Some jobs still have unclosed tags. Manual review needed.\n');
            stillBroken.slice(0, 5).forEach(job => {
                console.log(`  - Job ${job.id}: ${job.title}`);
            });
        }
        
        console.log('='.repeat(70) + '\n');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        db.close();
        console.log('Database connection closed.\n');
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { autoCloseHtmlTags, hasUnclosedTags };
