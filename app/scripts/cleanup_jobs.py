#!/usr/bin/env python3
"""WantokJobs data quality cleanup script."""

import sqlite3
import re
import html
from collections import defaultdict

DB_PATH = '/opt/wantokjobs/app/server/data/wantokjobs.db'

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

stats = defaultdict(int)

# Add quality_score column if not exists
try:
    cur.execute("ALTER TABLE jobs ADD COLUMN quality_score INTEGER DEFAULT 0")
    print("Added quality_score column")
except:
    print("quality_score column already exists")

# Also need status to support 'inactive'
# Check current CHECK constraint - sqlite doesn't support ALTER CHECK, but we can still set values
# We'll use 'closed' instead of 'inactive' since the schema constrains it

# ============================================================
# 1. CLEAN TITLES
# ============================================================
print("\n=== 1. CLEANING TITLES ===")

# PNG provinces/regions for stripping from titles
locations = [
    'Morobe', 'National Capital District', 'NCD', 'Eastern Highlands', 
    'East Sepik', 'Western Highlands', 'Western Province', 'West Sepik',
    'Southern Highlands', 'Hela', 'Jiwaka', 'Simbu', 'Chimbu',
    'Enga', 'Madang', 'Milne Bay', 'Gulf', 'Central Province', 'Central',
    'East New Britain', 'West New Britain', 'New Ireland', 'Manus',
    'Bougainville', 'Autonomous Region of Bougainville', 'Oro', 'Northern',
    'Lae', 'Port Moresby', 'Mt Hagen', 'Goroka', 'Wewak', 'Kokopo',
    'Kimbe', 'Alotau', 'Rabaul', 'Arawa', 'Daru', 'Kavieng', 'Kundiawa',
    'Lorengau', 'Mendi', 'Popondetta', 'Tari', 'Vanimo', 'Wabag',
    'PNG', 'Papua New Guinea'
]

# Strip location suffixes like "- Morobe", "- National Capital District"
rows = cur.execute("SELECT id, title FROM jobs WHERE status='active' AND title LIKE '%- %'").fetchall()
for row in rows:
    title = row['title']
    new_title = title
    # Try stripping known location suffixes
    for loc in sorted(locations, key=len, reverse=True):
        pattern = r'\s*[-–—]\s*' + re.escape(loc) + r'\s*$'
        new_title = re.sub(pattern, '', new_title, flags=re.IGNORECASE)
    # Also strip generic trailing " - City, Province" patterns
    new_title = re.sub(r'\s*[-–—]\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?\s*$', '', new_title)
    if new_title != title and len(new_title) > 3:
        cur.execute("UPDATE jobs SET title=?, updated_at=datetime('now') WHERE id=?", (new_title.strip(), row['id']))
        stats['title_location_stripped'] += 1

# Remove "Position:" prefix
rows = cur.execute("SELECT id, title FROM jobs WHERE status='active' AND title LIKE 'Position:%'").fetchall()
for row in rows:
    new_title = re.sub(r'^Position:\s*', '', row['title']).strip()
    if new_title:
        cur.execute("UPDATE jobs SET title=?, updated_at=datetime('now') WHERE id=?", (new_title, row['id']))
        stats['title_position_prefix'] += 1

# Fix ALL CAPS titles to Title Case (keep acronyms)
ACRONYMS = {'IT', 'HR', 'CEO', 'CFO', 'CTO', 'COO', 'PNG', 'NCD', 'FMCG', 'ICT', 'NGO', 
            'UN', 'WHO', 'WASH', 'HIV', 'AIDS', 'GIS', 'QA', 'PM', 'HSE', 'OHS', 'EHS',
            'KPI', 'SOE', 'GM', 'AGM', 'MD', 'SME', 'CTSL', 'PNGFPL', 'SBM', 'SCU',
            'M&E', 'MEAL', 'NFI', 'GBV', 'IDP', 'UNDP', 'UNICEF', 'WFP'}

def smart_title_case(s):
    words = s.split()
    result = []
    for w in words:
        upper = w.upper().strip('(),-:/')
        if upper in ACRONYMS:
            result.append(w.upper())
        elif w.startswith('(') or w.startswith('-'):
            inner = w[1:]
            if inner.upper() in ACRONYMS:
                result.append(w[0] + inner.upper())
            else:
                result.append(w[0] + inner.capitalize())
        else:
            result.append(w.capitalize())
    return ' '.join(result)

rows = cur.execute("SELECT id, title FROM jobs WHERE status='active' AND title = UPPER(title) AND LENGTH(title) > 5").fetchall()
for row in rows:
    title = row['title']
    # Special case: "COMPLETE AUTO SERVICES -LAE" is a company name, not job title
    if 'COMPLETE AUTO SERVICES' in title:
        # Check description for actual job title
        desc = cur.execute("SELECT description, company_name FROM jobs WHERE id=?", (row['id'],)).fetchone()
        cur.execute("UPDATE jobs SET title='Auto Services Technician', company_name='Complete Auto Services', updated_at=datetime('now') WHERE id=?", (row['id'],))
        stats['title_caps_fixed'] += 1
        stats['title_special_fix'] += 1
    else:
        new_title = smart_title_case(title)
        cur.execute("UPDATE jobs SET title=?, updated_at=datetime('now') WHERE id=?", (new_title, row['id']))
        stats['title_caps_fixed'] += 1

print(f"  Location suffixes stripped: {stats['title_location_stripped']}")
print(f"  Position: prefix removed: {stats['title_position_prefix']}")
print(f"  ALL CAPS fixed: {stats['title_caps_fixed']}")

# ============================================================
# 2. EXTRACT COMPANY NAMES
# ============================================================
print("\n=== 2. EXTRACTING COMPANY NAMES ===")

rows = cur.execute("""
    SELECT id, title, description, source, company_name 
    FROM jobs WHERE status='active' AND (company_name IS NULL OR company_name = '')
""").fetchall()

for row in rows:
    desc = row['description'] or ''
    source = row['source'] or ''
    company = None
    
    # Pattern: "Job opportunity at X. For full details..."
    m = re.search(r'Job opportunity at ([^.]+?)\.', desc)
    if m:
        company = m.group(1).strip()
    
    # Pattern: "Job opportunity at X. Visit..."
    if not company:
        m = re.search(r'Job opportunity at ([^.]+?)\.\s*Visit', desc)
        if m:
            company = m.group(1).strip()
    
    # Pattern: "About the Company\nX" or "About X"
    if not company:
        m = re.search(r'About (?:the )?Company[:\s]*\n\s*([^\n]+)', desc, re.IGNORECASE)
        if m:
            company = m.group(1).strip()
    
    # Pattern: company name in "X is seeking" or "X is looking for"
    if not company:
        m = re.match(r'^([A-Z][A-Za-z\s&.,()]+(?:Ltd|Limited|Inc|Corp|Group|Services|Solutions|Company|Pty|PNG)\.?)\s+(?:is|are)\s+(?:seeking|looking|hiring|recruiting)', desc)
        if m:
            company = m.group(1).strip()
    
    # Source-based inference
    if not company and source:
        source_map = {
            'airniugini': 'Air Niugini',
            'pngjobseek': None,  # aggregator
            'headhunter:pngworkforce': None,
            'headhunter': None,
            'deep-scrape:pngworkforce': None,
        }
        if source in source_map and source_map[source]:
            company = source_map[source]
    
    if not company:
        company = "Employer on WantokJobs"
    
    # Clean up company name
    company = company.strip().rstrip('.')
    
    cur.execute("UPDATE jobs SET company_name=?, updated_at=datetime('now') WHERE id=?", (company, row['id']))
    if company == "Employer on WantokJobs":
        stats['company_default'] += 1
    else:
        stats['company_extracted'] += 1

print(f"  Company extracted from description: {stats['company_extracted']}")
print(f"  Set to default: {stats['company_default']}")

# ============================================================
# 3. STRIP HTML
# ============================================================
print("\n=== 3. STRIPPING HTML ===")

def strip_html(text):
    # Replace <br>, <br/>, </p>, </div>, </li>, </h1-6> with newlines
    text = re.sub(r'<br\s*/?>|</p>|</div>|</li>|</h[1-6]>|</tr>', '\n', text, flags=re.IGNORECASE)
    # Replace <li> with bullet
    text = re.sub(r'<li[^>]*>', '• ', text, flags=re.IGNORECASE)
    # Remove <img> tags entirely
    text = re.sub(r'<img[^>]*>', '', text, flags=re.IGNORECASE)
    # Remove all remaining tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = html.unescape(text)
    # Clean up excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    # Strip leading/trailing whitespace per line
    lines = [l.strip() for l in text.split('\n')]
    text = '\n'.join(lines)
    return text.strip()

rows = cur.execute("SELECT id, description FROM jobs WHERE status='active' AND description LIKE '%<%>%'").fetchall()
for row in rows:
    new_desc = strip_html(row['description'])
    cur.execute("UPDATE jobs SET description=?, updated_at=datetime('now') WHERE id=?", (new_desc, row['id']))
    stats['html_stripped'] += 1

print(f"  HTML stripped: {stats['html_stripped']}")

# ============================================================
# 4. HANDLE STUB/GARBAGE DESCRIPTIONS
# ============================================================
print("\n=== 4. HANDLING STUB DESCRIPTIONS ===")

rows = cur.execute("""
    SELECT id, title, description, company_name 
    FROM jobs WHERE status='active' AND LENGTH(description) < 100
""").fetchall()

for row in rows:
    desc = row['description'] or ''
    title = row['title'] or ''
    
    is_stub = False
    
    # Check if description is just title + location repeated
    if len(desc) < 100:
        desc_clean = desc.strip().lower()
        title_clean = title.strip().lower()
        if desc_clean.startswith(title_clean) or title_clean.startswith(desc_clean[:20]):
            is_stub = True
    
    # Check for generic filler
    if re.match(r'^Job opportunity at .+?\.\s*(For full details|Visit the listing)', desc):
        is_stub = True
    
    if is_stub:
        cur.execute("UPDATE jobs SET status='closed', updated_at=datetime('now') WHERE id=?", (row['id'],))
        stats['stub_deactivated'] += 1
    else:
        stats['stub_kept'] += 1

print(f"  Stub/garbage deactivated: {stats['stub_deactivated']}")
print(f"  Short but kept: {stats['stub_kept']}")

# ============================================================
# 5. NORMALIZE DESCRIPTION FORMATTING
# ============================================================
print("\n=== 5. NORMALIZING DESCRIPTIONS ===")

rows = cur.execute("SELECT id, description FROM jobs WHERE status='active'").fetchall()
for row in rows:
    desc = row['description']
    original = desc
    
    # Remove spam prefixes
    desc = re.sub(r'^(JOB VACANCY!?|URGENT HIRING!?|WE\'?RE HIRING!?|VACANCY!?|HIRING!?)\s*\n*', '', desc, flags=re.IGNORECASE).strip()
    
    # Add line breaks before common section headers if not already there
    section_headers = [
        'Requirements:', 'Key Requirements:', 'Minimum Requirements:',
        'Responsibilities:', 'Key Responsibilities:', 'Duties:',
        'How to Apply:', 'How To Apply:', 'Application:',
        'Qualifications:', 'Key Qualifications:',
        'About the Company:', 'About Us:', 'Company Overview:',
        'Benefits:', 'What We Offer:',
        'Experience:', 'Skills:', 'Education:',
        'Deadline:', 'Application Deadline:', 'Closing Date:',
        'Location:', 'Position:', 'Role:', 'Salary:',
        'Key Duties:', 'Duties and Responsibilities:',
        'Key Selection Criteria:', 'Selection Criteria:',
    ]
    for header in section_headers:
        # Ensure double newline before section headers
        pattern = r'(?<!\n)\n(' + re.escape(header) + ')'
        desc = re.sub(pattern, '\n\n\\1', desc)
    
    # Remove orphaned formatting artifacts
    desc = re.sub(r'\*{3,}', '', desc)
    desc = re.sub(r'_{3,}', '', desc)
    desc = re.sub(r'-{5,}', '---', desc)
    desc = re.sub(r'={3,}', '', desc)
    
    # Clean excessive newlines
    desc = re.sub(r'\n{4,}', '\n\n\n', desc)
    
    if desc != original:
        cur.execute("UPDATE jobs SET description=?, updated_at=datetime('now') WHERE id=?", (desc, row['id']))
        stats['desc_normalized'] += 1

print(f"  Descriptions normalized: {stats['desc_normalized']}")

# ============================================================
# 6. ADD QUALITY SCORE
# ============================================================
print("\n=== 6. CALCULATING QUALITY SCORES ===")

rows = cur.execute("""
    SELECT id, company_name, salary_min, salary_max, description, job_type, source
    FROM jobs WHERE status='active'
""").fetchall()

for row in rows:
    score = 0
    desc = row['description'] or ''
    
    # Has company name (+20)
    cn = row['company_name'] or ''
    if cn and cn != 'Employer on WantokJobs':
        score += 20
    
    # Has salary (+15)
    if row['salary_min'] or row['salary_max']:
        score += 15
    
    # Description length
    if len(desc) > 500:
        score += 20
    elif len(desc) > 200:
        score += 10
    
    # Has proper sections (+15)
    section_pattern = r'(Requirements|Responsibilities|Qualifications|How to Apply|Duties|Selection Criteria|Key Skills|Experience Required)'
    if re.search(section_pattern, desc, re.IGNORECASE):
        score += 15
    
    # Has job_type (+10)
    if row['job_type']:
        score += 10
    
    # Not scraped (+10)
    src = row['source'] or ''
    if not src or src == 'manual':
        score += 10
    
    # Has contact info (+10)
    if re.search(r'[\w.-]+@[\w.-]+\.\w+', desc) or re.search(r'(?:phone|tel|call|contact)[\s:]+[\d\s+()-]+', desc, re.IGNORECASE):
        score += 10
    
    cur.execute("UPDATE jobs SET quality_score=? WHERE id=?", (score, row['id']))
    stats['scored'] += 1

# Get distribution
dist = cur.execute("""
    SELECT 
        CASE WHEN quality_score >= 80 THEN '80-100'
             WHEN quality_score >= 60 THEN '60-79'
             WHEN quality_score >= 40 THEN '40-59'
             WHEN quality_score >= 20 THEN '20-39'
             ELSE '0-19' END as bracket,
        COUNT(*) as cnt
    FROM jobs WHERE status='active'
    GROUP BY bracket ORDER BY bracket DESC
""").fetchall()

print(f"  Jobs scored: {stats['scored']}")
print("  Score distribution:")
for d in dist:
    print(f"    {d['bracket']}: {d['cnt']}")

conn.commit()
conn.close()

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "="*50)
print("CLEANUP SUMMARY")
print("="*50)
print(f"1. Titles cleaned:")
print(f"   - Location suffixes removed: {stats['title_location_stripped']}")
print(f"   - Position: prefix removed: {stats['title_position_prefix']}")
print(f"   - ALL CAPS fixed: {stats['title_caps_fixed']}")
print(f"2. Company names:")
print(f"   - Extracted from description: {stats['company_extracted']}")
print(f"   - Set to default: {stats['company_default']}")
print(f"3. HTML stripped: {stats['html_stripped']}")
print(f"4. Stub descriptions:")
print(f"   - Deactivated: {stats['stub_deactivated']}")
print(f"   - Kept (legitimate): {stats['stub_kept']}")
print(f"5. Descriptions normalized: {stats['desc_normalized']}")
print(f"6. Quality scores calculated: {stats['scored']}")
print(f"\nTotal active jobs remaining: check DB")
