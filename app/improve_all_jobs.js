const Database = require('./node_modules/better-sqlite3');
const db = new Database('./server/data/wantokjobs.db');

// Common spelling/grammar fixes
const SPELLING_FIXES = {
  'Chrisitan': 'Christian',
  'chrisitan': 'christian',
  'precisly': 'precisely',
  'seperate': 'separate',
  'recieve': 'receive',
  'occured': 'occurred',
  'acheive': 'achieve',
  'accomodate': 'accommodate',
  'responsibilites': 'responsibilities',
  'experiance': 'experience',
  'qualifactions': 'qualifications',
  'recomendation': 'recommendation',
  'sucessful': 'successful',
  'sucessfully': 'successfully',
};

// Extract company name from description
function extractCompanyName(description, title) {
  // Look for patterns like "Company: X", "Company Name: X", "Organization: X"
  const patterns = [
    /Company:\s*([A-Z][A-Za-z0-9\s&\-\.]+(?:Limited|Ltd|Corporation|Corp|Inc|PNG)?)/i,
    /Company Name:\s*([A-Z][A-Za-z0-9\s&\-\.]+(?:Limited|Ltd|Corporation|Corp|Inc|PNG)?)/i,
    /Organization:\s*([A-Z][A-Za-z0-9\s&\-\.]+(?:Limited|Ltd|Corporation|Corp|Inc|PNG)?)/i,
    /Location:.*?Company:\s*([A-Z][A-Za-z0-9\s&\-\.]+(?:Limited|Ltd|Corporation|Corp|Inc|PNG)?)/i,
    /<p>\s*([A-Z][A-Za-z0-9\s&\-\.]+(?:Limited|Ltd|Corporation|Corp|Inc|PNG))\s+is\s+(seeking|looking|hiring)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Validate it's not too long and looks like a company name
      if (name.length < 60 && name.length > 2 && !name.match(/^(the|position|location)/i)) {
        return name;
      }
    }
  }
  return null;
}

// Fix spelling errors
function fixSpelling(text) {
  let fixed = text;
  for (const [wrong, right] of Object.entries(SPELLING_FIXES)) {
    const regex = new RegExp('\\b' + wrong + '\\b', 'g');
    fixed = fixed.replace(regex, right);
  }
  return fixed;
}

// Clean and structure HTML
function improveDescription(description, title, company) {
  let html = description;
  
  // Fix spelling
  html = fixSpelling(html);
  
  // Remove excessive whitespace
  html = html.replace(/\n\s*\n\s*\n+/g, '\n\n');
  html = html.replace(/\s+/g, ' ');
  
  // Fix common issues with lists - ensure they're properly wrapped
  html = html.replace(/<li>\s*/g, '<li>');
  html = html.replace(/\s*<\/li>/g, '</li>');
  
  // Ensure paragraphs around headings
  html = html.replace(/<\/p>\s*<h3>/g, '</p>\n<h3>');
  html = html.replace(/<\/h3>\s*<p>/g, '</h3>\n<p>');
  
  // Fix "several positions" wording if only one position described
  if (html.match(/several\s+positions?/i) && !html.match(/position\s+1:|position\s+2:|role\s+1:|role\s+2:/i)) {
    html = html.replace(/several\s+positions?/gi, 'this position');
    html = html.replace(/these\s+positions?/gi, 'this position');
  }
  
  // Ensure standard section headers exist
  const sections = {
    company: ['About the Company', 'Company Overview', 'About Us'],
    role: ['About the Role', 'Position Overview', 'Role Overview', 'Overview'],
    responsibilities: ['Key Responsibilities', 'Responsibilities', 'Duties'],
    requirements: ['Requirements', 'Qualifications', 'Required Qualifications', 'Selection Criteria'],
    apply: ['How to Apply', 'Application Process', 'Application Instructions'],
    closing: ['Closing Date', 'Application Deadline', 'Deadline']
  };
  
  // Normalize section headers
  for (const [key, variants] of Object.entries(sections)) {
    for (const variant of variants) {
      const regex = new RegExp(`<h3>\\s*${variant}\\s*:?\\s*</h3>`, 'gi');
      if (html.match(regex)) {
        // Use the first (preferred) variant
        html = html.replace(regex, `<h3>${variants[0]}</h3>`);
        break;
      }
    }
  }
  
  // If missing "How to Apply" section, try to identify and wrap it
  if (!html.match(/<h3>\s*How to Apply/i)) {
    // Look for application instructions
    const applyPatterns = [
      /(To apply.*?(?:email|send|submit).*?(?:<\/p>|<\/li>))/is,
      /(Interested candidates.*?(?:email|send|submit).*?(?:<\/p>|<\/li>))/is,
      /(Please (?:email|send|submit).*?(?:<\/p>|<\/li>))/is,
      /(Applications? (?:should|must|can) be (?:sent|submitted|emailed).*?(?:<\/p>|<\/li>))/is,
    ];
    
    for (const pattern of applyPatterns) {
      const match = html.match(pattern);
      if (match) {
        // Check if it's not already under a heading
        const beforeMatch = html.substring(0, match.index);
        const lastH3 = beforeMatch.lastIndexOf('<h3>');
        const textAfterH3 = lastH3 >= 0 ? html.substring(lastH3) : '';
        
        if (!textAfterH3.match(/<h3>.*?How to Apply/i)) {
          html = html.replace(match[1], `<h3>How to Apply</h3>\n<p>${match[1].replace(/^<p>/, '').replace(/<\/p>$/, '')}</p>`);
        }
        break;
      }
    }
  }
  
  // Clean up any remaining issues
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<ul>\s*<\/ul>/g, '');
  html = html.trim();
  
  return html;
}

// Process jobs in batches
async function processJobs() {
  const allJobs = db.prepare(`
    SELECT id, title, description, company_display_name 
    FROM jobs 
    WHERE status = 'active'
    ORDER BY id
  `).all();
  
  console.log(`Found ${allJobs.length} active jobs to process\n`);
  
  const updateStmt = db.prepare(`
    UPDATE jobs 
    SET description = ?, 
        company_display_name = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `);
  
  let improved = 0;
  let companyNamesExtracted = 0;
  const examples = [];
  
  const batchSize = 20;
  for (let i = 0; i < allJobs.length; i += batchSize) {
    const batch = allJobs.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (jobs ${i + 1}-${Math.min(i + batchSize, allJobs.length)})...`);
    
    for (const job of batch) {
      const originalDesc = job.description;
      const originalCompany = job.company_display_name;
      
      // Improve description
      const improvedDesc = improveDescription(originalDesc, job.title, originalCompany);
      
      // Extract company name if missing
      let companyName = originalCompany;
      if (!companyName) {
        companyName = extractCompanyName(improvedDesc, job.title);
        if (companyName) {
          companyNamesExtracted++;
        }
      }
      
      // Only update if something changed
      if (improvedDesc !== originalDesc || companyName !== originalCompany) {
        updateStmt.run(improvedDesc, companyName, job.id);
        improved++;
        
        // Save first 3 examples
        if (examples.length < 3) {
          examples.push({
            id: job.id,
            title: job.title,
            before: originalDesc.substring(0, 400),
            after: improvedDesc.substring(0, 400),
            companyBefore: originalCompany,
            companyAfter: companyName
          });
        }
      }
    }
  }
  
  console.log(`\n✅ Processing complete!`);
  console.log(`   ${improved} jobs improved`);
  console.log(`   ${companyNamesExtracted} company names extracted`);
  
  // Show examples
  console.log(`\n=== EXAMPLES (first 3 changes) ===`);
  examples.forEach((ex, i) => {
    console.log(`\n--- Example ${i + 1}: Job #${ex.id} ---`);
    console.log(`Title: ${ex.title}`);
    console.log(`Company: "${ex.companyBefore || 'NULL'}" → "${ex.companyAfter || 'NULL'}"`);
    console.log(`\nBEFORE:\n${ex.before}...\n`);
    console.log(`AFTER:\n${ex.after}...`);
  });
  
  // Rebuild FTS
  console.log(`\n🔄 Rebuilding full-text search index...`);
  db.prepare("INSERT INTO jobs_fts(jobs_fts) VALUES('rebuild')").run();
  console.log(`✅ FTS rebuild complete!`);
  
  return { improved, companyNamesExtracted, total: allJobs.length };
}

// Run the process
try {
  const result = processJobs();
  console.log(`\n✨ All done! Processed ${result.total} jobs, improved ${result.improved}.`);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
