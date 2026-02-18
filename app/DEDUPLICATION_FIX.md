# Job Description Deduplication Fix

## Problem Identified
Job descriptions were showing DUPLICATE content:
- "Key Responsibilities" appeared twice
- "Requirements" appeared both as raw paragraphs AND formatted bullet points
- Same items repeated within the same section

## Root Causes
1. **AI Formatter**: Not explicitly instructed to merge duplicates
2. **HTML Builder**: No de-duplication logic for list items
3. **Job Detail Page**: Rendering BOTH `formatted_description` AND raw `description` + separate `requirements` field

## Fixes Implemented

### 1. AI Formatter Prompt Enhancement
**File**: `server/lib/job-formatter.js`

Added explicit instructions:
```
CRITICAL RULES FOR DUPLICATE REMOVAL:
- MERGE duplicate sections: If "responsibilities" appears twice in different places, combine into ONE list
- REMOVE redundant content: If requirements appear as both paragraphs AND bullet points, extract ONLY the bullet points
- De-duplicate items: If same requirement/responsibility appears multiple times, include it ONLY ONCE
- If a section heading repeats (e.g., "Key Responsibilities" appears twice), merge all content under that heading into one section
- Job descriptions often repeat content - your job is to extract it ONCE in the most structured format
```

### 2. HTML Builder De-duplication Logic
**File**: `server/lib/job-formatter.js`

Added `deduplicateItems()` function:
- Normalizes text for comparison (lowercase, remove punctuation, trim)
- Detects exact duplicates
- Detects similar items (substring matching)
- Applied to all list sections: responsibilities, requirements, benefits

**Test results**:
- Input: 4 responsibilities (2 duplicates) → Output: 3 unique ✓
- Input: 4 requirements (2 similar) → Output: 3 unique ✓
- Input: 4 benefits (2 exact duplicates) → Output: 3 unique ✓

### 3. Job Detail Page Logic Fix
**File**: `client/src/pages/JobDetail.jsx`

**CRITICAL CHANGE**:
```jsx
{/* If formatted_description exists, show ONLY that */}
{job.formatted_description ? (
  <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(job.formatted_description) }} />
) : (
  <>
    {/* Fallback: Show raw description + separate requirements ONLY if no formatted version */}
    <h2>About the Role</h2>
    <div>{job.description}</div>
    
    {/* Requirements - only show if no formatted_description exists */}
    {requirements.length > 0 && (
      <div>
        <h3>Key Requirements</h3>
        <ul>{requirements.map(...)}</ul>
      </div>
    )}
  </>
)}
```

**Before**: Rendered formatted_description AND raw description AND separate requirements (triple duplication!)
**After**: Renders ONLY formatted_description OR (raw description + requirements) as fallback

### 4. HTML Comment Flag
Added HTML comment to `formatted_description`:
```html
<!-- FORMATTED_DESCRIPTION: Complete job description with all sections merged and deduplicated. Do not render raw description or separate requirements. -->
```

This serves as documentation for developers.

## How to Fix Existing Jobs

All jobs formatted BEFORE this fix may still have duplicates in their `formatted_description`.

### Option 1: Re-format All Jobs
```bash
# Clear format_status to force re-formatting
cd /data/.openclaw/workspace/data/wantok/app
node -e "
const db = require('./server/database');
db.prepare('UPDATE jobs SET format_status = NULL, formatted_description = NULL WHERE formatted_description IS NOT NULL').run();
console.log('Cleared all formatted descriptions. Run batch formatter to re-process.');
"

# Run batch formatter
node system/agents/job-formatter-batch.js --batch-size=20
```

### Option 2: Re-format Only Recent Jobs (Last 30 Days)
```bash
cd /data/.openclaw/workspace/data/wantok/app
node -e "
const db = require('./server/database');
const result = db.prepare(\`
  UPDATE jobs 
  SET format_status = NULL, formatted_description = NULL 
  WHERE formatted_description IS NOT NULL 
    AND created_at >= datetime('now', '-30 days')
\`).run();
console.log('Cleared \${result.changes} recent formatted descriptions.');
"

node system/agents/job-formatter-batch.js --batch-size=20
```

### Option 3: Re-format on Demand (Gradual)
New and updated jobs will automatically use the improved formatter.
Existing jobs will be fixed as they're edited by employers.

## Verification

To verify a job is fixed:
```bash
cd /data/.openclaw/workspace/data/wantok/app
node -e "
const db = require('./server/database');
const job = db.prepare('SELECT id, title, formatted_description FROM jobs WHERE id = ?').get(YOUR_JOB_ID);
console.log('Job:', job.title);
console.log('Has formatted description:', !!job.formatted_description);
if (job.formatted_description) {
  console.log('Contains HTML comment:', job.formatted_description.includes('FORMATTED_DESCRIPTION'));
  console.log('Length:', job.formatted_description.length);
  console.log('Preview:', job.formatted_description.substring(0, 300));
}
"
```

Look for:
- ✓ HTML comment at the top
- ✓ Each section (Responsibilities, Requirements, Benefits) appears ONCE
- ✓ No duplicate bullet points within sections

## Monitoring

Track formatting statistics:
```bash
cd /data/.openclaw/workspace/data/wantok/app
node -e "
const db = require('./server/database');
const stats = db.prepare(\`
  SELECT 
    format_status,
    COUNT(*) as count
  FROM jobs
  WHERE status = 'active'
  GROUP BY format_status
\`).all();
console.table(stats);
"
```

Expected output:
```
┌─────────┬────────────────┬───────┐
│ (index) │ format_status  │ count │
├─────────┼────────────────┼───────┤
│    0    │ 'formatted'    │  439  │
│    1    │ 'pending'      │   12  │
│    2    │ 'failed'       │    3  │
│    3    │ null           │  102  │
└─────────┴────────────────┴───────┘
```

## Rollout Strategy

**Recommended**: Option 2 (Re-format recent jobs)
- Most users view recent jobs
- Gradual rollout
- Can monitor for issues
- Run batch formatter daily until all done

**Cron job** (add to server crontab):
```bash
# Re-format 20 jobs every 6 hours
0 */6 * * * cd /path/to/app && node system/agents/job-formatter-batch.js --batch-size=20 >> /var/log/job-formatter.log 2>&1
```

## Commits
- Initial implementation: `5773c7d4`
- Deduplication fix: `41a17ab9`

## Testing Checklist
- [x] AI formatter removes duplicate responsibilities
- [x] AI formatter removes duplicate requirements
- [x] AI formatter removes duplicate benefits
- [x] HTML builder de-duplicates items
- [x] Job detail page shows ONLY formatted_description (not both)
- [x] Job detail page shows separate requirements ONLY as fallback
- [x] Test case passed: 4 items → 3 unique
- [x] Commits pushed to GitHub

## Next Steps
1. Monitor error logs for any AI formatting failures
2. Run batch formatter to re-process existing jobs
3. Verify fixed jobs in production
4. Add to cron for automatic daily processing
