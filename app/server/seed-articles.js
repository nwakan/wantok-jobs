require('dotenv').config();
const db = require('./database');

const articles = [
  {
    title: "Top 10 In-Demand Skills in Papua New Guinea 2026",
    slug: "top-10-in-demand-skills-png-2026",
    excerpt: "Discover the most sought-after skills in PNG's job market this year. From mining engineering to digital literacy, here's what employers are looking for.",
    category: "industry-news",
    tags: "skills,careers,png,employment",
    content: `<p>Papua New Guinea's economy continues to evolve, and with it, the skills employers need most. Whether you're a fresh graduate in Port Moresby or an experienced professional in Lae, understanding the job market is crucial for career growth.</p>
<h2>1. Mining & Resource Engineering</h2><p>PNG's mining sector remains the backbone of the economy. Engineers with experience in gold, copper, and LNG extraction are consistently in high demand across sites from Porgera to PNG LNG.</p>
<h2>2. Information Technology</h2><p>Digital transformation is sweeping across PNG businesses. Companies need IT professionals who can manage networks, develop software, and ensure cybersecurity.</p>
<h2>3. Accounting & Finance</h2><p>With CPA qualification and knowledge of PNG tax regulations, accountants are essential across banking, government, and the private sector.</p>
<h2>4. Healthcare & Nursing</h2><p>PNG faces ongoing healthcare challenges, creating consistent demand for nurses, doctors, and public health professionals, especially in rural areas.</p>
<h2>5. Project Management</h2><p>Large infrastructure projects across the country need skilled project managers who can handle complex timelines, budgets, and stakeholder relationships.</p>
<h2>6. Digital Marketing</h2><p>As PNG businesses move online, digital marketing skills including social media management, content creation, and SEO are increasingly valued.</p>
<h2>7. Agriculture & Agribusiness</h2><p>Coffee, cocoa, palm oil, and vanilla production require skilled agricultural professionals who understand modern farming techniques.</p>
<h2>8. Construction & Civil Engineering</h2><p>Road upgrades, building construction, and urban development across Port Moresby, Lae, and Mt Hagen fuel demand for construction professionals.</p>
<h2>9. Human Resources</h2><p>Companies are recognizing the importance of proper HR management, creating opportunities for HR professionals with knowledge of PNG employment law.</p>
<h2>10. Communication & Tok Pisin Literacy</h2><p>Strong communication skills in English and Tok Pisin remain fundamental. Professionals who can bridge cultural and language gaps are invaluable.</p>
<h2>How to Prepare</h2><p>If you're looking to build these skills, consider professional certifications, online courses, and practical experience through internships. WantokJobs lists hundreds of positions requiring these skills — start your search today.</p>`
  },
  {
    title: "How to Write a Winning CV for PNG Employers",
    slug: "how-to-write-winning-cv-png",
    excerpt: "Your CV is your first impression. Learn how to craft a professional CV that stands out to Papua New Guinean employers.",
    category: "career-advice",
    tags: "cv,resume,job-search,tips",
    content: `<p>In PNG's competitive job market, your CV can make or break your chances. Here's how to create one that gets you noticed.</p>
<h2>Keep It Clean and Professional</h2><p>Use a simple, clean format. Stick to 2-3 pages maximum. Use a professional font like Arial or Calibri, and avoid flashy colours or graphics unless you're applying for a creative role.</p>
<h2>Start with a Strong Summary</h2><p>Begin with a 2-3 sentence professional summary that highlights your key strengths and what you bring to the role. Tailor this for each application.</p>
<h2>Highlight Relevant Experience</h2><p>List your work experience in reverse chronological order. For each role, include your title, company name, dates, and 3-5 bullet points describing your achievements — not just duties.</p>
<h2>Include Your Education</h2><p>List your qualifications, including any degrees from UPNG, Unitech, or other institutions. Include professional certifications like CPA, NATTB trade certificates, or industry-specific qualifications.</p>
<h2>Skills Section</h2><p>Include both technical skills (e.g., "Proficient in SAP", "NATTB Certified Electrician") and soft skills (e.g., "Fluent in English, Tok Pisin, and Motu").</p>
<h2>References</h2><p>Include 2-3 professional references with their contact details and your relationship to them. Make sure you ask permission first!</p>
<h2>Common Mistakes to Avoid</h2>
<ul><li>Spelling and grammar errors — proofread everything</li><li>Including a photo unless specifically requested</li><li>Using an unprofessional email address</li><li>Listing every job you've ever had — focus on relevant experience</li><li>Exaggerating qualifications — employers will verify</li></ul>
<p>Ready to put your new CV to work? Browse thousands of jobs on WantokJobs and apply with confidence.</p>`
  },
  {
    title: "Mining Industry Jobs in PNG: What You Need to Know",
    slug: "mining-industry-jobs-png",
    excerpt: "PNG's mining sector offers some of the highest-paying jobs in the country. Here's your guide to breaking into the industry.",
    category: "industry-news",
    tags: "mining,careers,salary,png",
    content: `<p>Papua New Guinea's mining and resources sector contributes over 25% of GDP and offers some of the most lucrative career opportunities in the Pacific region.</p>
<h2>Major Mining Operations</h2><p>Key operations include OK Tedi (copper/gold), Porgera (gold), Lihir (gold), Ramu Nickel, and the massive PNG LNG project. Each site employs thousands of nationals and expatriates.</p>
<h2>Types of Roles Available</h2>
<ul><li><strong>Engineers:</strong> Mining, mechanical, electrical, and civil engineers are always needed</li><li><strong>Geologists:</strong> Exploration and resource estimation roles</li><li><strong>Operators:</strong> Heavy equipment operators, drillers, and blasters</li><li><strong>Safety:</strong> OHS officers and environmental specialists</li><li><strong>Support:</strong> Catering, logistics, maintenance, and administration</li></ul>
<h2>Salary Expectations</h2><p>Mining salaries in PNG are among the highest in the country. Entry-level operators can earn K40,000-60,000/year, while experienced engineers may earn K150,000-300,000+. Most mine-site roles include accommodation, meals, and fly-in-fly-out (FIFO) arrangements.</p>
<h2>How to Get Started</h2><p>If you don't have mining experience, consider starting with a trade certificate from a NATTB-accredited institution. Many mining companies offer graduate programs and apprenticeships for PNG nationals.</p>
<p>Search mining jobs on WantokJobs and set up alerts to be notified when new positions are posted.</p>`
  },
  {
    title: "Remote Work Opportunities in the Pacific Islands",
    slug: "remote-work-opportunities-pacific",
    excerpt: "The remote work revolution has reached the Pacific. Learn how PNG professionals can access global opportunities from home.",
    category: "job-search-tips",
    tags: "remote-work,digital,pacific,opportunities",
    content: `<p>The global shift to remote work has opened up new possibilities for talented professionals across the Pacific Islands, including Papua New Guinea.</p>
<h2>Growing Remote Sectors</h2><p>PNG professionals are finding remote opportunities in IT support, software development, customer service, data entry, virtual assistance, content writing, and digital marketing.</p>
<h2>Challenges and Solutions</h2><p>Internet connectivity remains the biggest challenge. Port Moresby and major towns have improving 4G coverage, and satellite internet options like Starlink are becoming available. Many remote workers use co-working spaces or cafes with reliable Wi-Fi.</p>
<h2>Skills That Translate Well</h2><p>Strong English communication, computer literacy, time management, and self-discipline are essential for remote work. Technical skills in web development, design, or accounting make you especially competitive.</p>
<h2>Where to Find Remote Jobs</h2><p>While WantokJobs lists local positions, you can also explore international remote job boards. Many Australian, New Zealand, and global companies are open to hiring Pacific Island talent for remote roles, especially in IT and customer service.</p>
<h2>Tips for Success</h2>
<ul><li>Set up a dedicated workspace at home</li><li>Invest in reliable internet backup</li><li>Build a professional online presence on LinkedIn</li><li>Start with freelance work to build your portfolio</li><li>Be mindful of time zones when working with international clients</li></ul>`
  },
  {
    title: "Salary Guide: What to Expect in Port Moresby",
    slug: "salary-guide-port-moresby-2026",
    excerpt: "Know your worth. This comprehensive salary guide covers typical pay ranges across major industries in Papua New Guinea's capital.",
    category: "career-advice",
    tags: "salary,port-moresby,compensation,careers",
    content: `<p>Understanding salary expectations is crucial whether you're negotiating a new role or evaluating your current compensation. Here's a snapshot of typical annual salaries in Port Moresby (in PGK).</p>
<h2>Banking & Finance</h2>
<ul><li>Bank Teller: K25,000 - K35,000</li><li>Accountant: K45,000 - K80,000</li><li>Finance Manager: K100,000 - K180,000</li><li>Bank Manager: K150,000 - K250,000+</li></ul>
<h2>Technology</h2>
<ul><li>IT Support: K30,000 - K50,000</li><li>Software Developer: K50,000 - K90,000</li><li>IT Manager: K80,000 - K150,000</li><li>CTO/CIO: K200,000+</li></ul>
<h2>Construction & Engineering</h2>
<ul><li>Tradesperson: K25,000 - K45,000</li><li>Site Engineer: K60,000 - K100,000</li><li>Project Manager: K100,000 - K200,000</li></ul>
<h2>Healthcare</h2>
<ul><li>Nurse: K30,000 - K55,000</li><li>Doctor (General): K80,000 - K150,000</li><li>Specialist: K150,000 - K300,000+</li></ul>
<h2>Administration & Office</h2>
<ul><li>Receptionist: K18,000 - K25,000</li><li>Office Administrator: K25,000 - K40,000</li><li>Executive Assistant: K35,000 - K55,000</li></ul>
<h2>Negotiation Tips</h2><p>Research the market rate before interviews. Factor in benefits like housing allowance, transport, and medical insurance — these can add 20-40% to your total package in PNG.</p>`
  },
  {
    title: "Interview Tips for PNG Job Seekers",
    slug: "interview-tips-png-job-seekers",
    excerpt: "Nervous about your upcoming interview? These practical tips will help you make a great impression with PNG employers.",
    category: "job-search-tips",
    tags: "interview,tips,job-search,preparation",
    content: `<p>Getting an interview is a big achievement — it means your CV impressed the employer. Now it's time to seal the deal in person.</p>
<h2>Before the Interview</h2>
<ul><li><strong>Research the company:</strong> Visit their website, understand their business, and know their recent news</li><li><strong>Know the role:</strong> Re-read the job description and prepare examples that match each requirement</li><li><strong>Prepare questions:</strong> Have 2-3 thoughtful questions ready to ask the interviewer</li><li><strong>Plan your route:</strong> Port Moresby traffic can be unpredictable — leave early and aim to arrive 15 minutes before</li></ul>
<h2>What to Wear</h2><p>Dress professionally but appropriately for the climate. For men, a clean shirt with trousers is standard. For women, a blouse with a skirt or trousers works well. Avoid overly casual clothing like thongs or shorts.</p>
<h2>During the Interview</h2>
<ul><li>Give a firm handshake and maintain eye contact</li><li>Answer questions using the STAR method: Situation, Task, Action, Result</li><li>Be honest — if you don't know something, say so and express willingness to learn</li><li>Show enthusiasm for the role and the company</li><li>If asked about salary expectations, give a range based on your research</li></ul>
<h2>After the Interview</h2><p>Send a brief thank-you email within 24 hours. If you don't hear back within the timeframe mentioned, it's okay to follow up politely after one week.</p>
<h2>Common PNG Interview Questions</h2>
<ul><li>"Tell me about yourself" — Focus on your professional background</li><li>"Why do you want to work here?" — Show you've done your research</li><li>"What are your strengths and weaknesses?" — Be genuine and self-aware</li><li>"Where do you see yourself in 5 years?" — Show ambition and commitment</li></ul>`
  },
  {
    title: "Growing Industries in Papua New Guinea",
    slug: "growing-industries-papua-new-guinea",
    excerpt: "Beyond mining and agriculture, PNG's economy is diversifying. Here are the sectors creating new job opportunities.",
    category: "industry-news",
    tags: "industries,growth,economy,png",
    content: `<p>While mining and agriculture remain pillars of PNG's economy, several emerging sectors are creating exciting new employment opportunities.</p>
<h2>Telecommunications</h2><p>With Digicel and Telikom PNG expanding 4G coverage, the telecom sector is booming. This creates roles in network engineering, customer service, sales, and technical support across the country.</p>
<h2>Financial Services</h2><p>Mobile banking and microfinance are growing rapidly. BSP, Kina Bank, and new fintech startups are hiring across Port Moresby and regional centres. Digital banking skills are especially valued.</p>
<h2>Construction & Infrastructure</h2><p>Government investment in roads, bridges, and public buildings — plus private construction in Port Moresby and Lae — is fuelling demand for engineers, project managers, tradespeople, and labourers.</p>
<h2>Tourism & Hospitality</h2><p>PNG's unique culture, diving spots, and natural beauty are attracting more visitors. Hotels, tour operators, and the hospitality sector in destinations like Kokoda, Rabaul, and the Sepik region are growing.</p>
<h2>Technology & Digital Services</h2><p>Local tech companies are emerging, and international firms are looking at PNG for outsourcing opportunities. Web development, app creation, and digital services represent a frontier of growth.</p>
<h2>Renewable Energy</h2><p>Solar installations across rural PNG, plus hydroelectric projects, are creating jobs in electrical engineering, installation, and maintenance.</p>
<h2>What This Means for Job Seekers</h2><p>Diversification means more career options. Consider upskilling in technology, finance, or renewable energy to position yourself for these growing sectors. Browse the latest opportunities on WantokJobs.</p>`
  },
  {
    title: "How Employers Can Attract Top Talent in PNG",
    slug: "employers-attract-top-talent-png",
    excerpt: "Struggling to find great candidates? Here's how PNG employers can stand out and attract the best talent in a competitive market.",
    category: "employer-tips",
    tags: "hiring,employers,recruitment,tips",
    content: `<p>Finding and retaining talented employees is one of the biggest challenges facing PNG businesses. Here's how to make your company a magnet for top talent.</p>
<h2>Write Better Job Descriptions</h2><p>Be specific about the role, requirements, and what you offer. Vague postings get vague applicants. Include salary ranges — transparency attracts more qualified candidates.</p>
<h2>Offer Competitive Packages</h2><p>In PNG, total compensation matters more than base salary. Housing allowance, transport, medical insurance, and education allowances for children can differentiate your offer significantly.</p>
<h2>Build Your Employer Brand</h2><p>Maintain an active presence on WantokJobs with a complete company profile, logo, and description. Candidates research companies before applying — make sure they find something impressive.</p>
<h2>Invest in Employee Development</h2><p>PNG professionals value growth opportunities. Offering training, professional development, and clear career progression paths will attract ambitious candidates and reduce turnover.</p>
<h2>Embrace Diversity</h2><p>PNG has over 800 languages and diverse cultures. Companies that embrace this diversity and create inclusive workplaces attract a wider talent pool and benefit from diverse perspectives.</p>
<h2>Speed Up Your Hiring Process</h2><p>Top candidates don't wait around. If your hiring process takes months, you'll lose the best people to faster-moving competitors. Aim to complete the process within 2-4 weeks.</p>
<h2>Use AI-Powered Matching</h2><p>WantokJobs' AI matching can automatically identify the best candidates for your roles, saving you time screening through hundreds of applications. Let technology do the heavy lifting.</p>`
  },
  {
    title: "The Rise of Digital Skills in the Pacific Region",
    slug: "rise-digital-skills-pacific-region",
    excerpt: "Digital literacy is becoming essential across the Pacific. Here's how PNG professionals can stay ahead of the curve.",
    category: "career-advice",
    tags: "digital-skills,technology,pacific,training",
    content: `<p>The digital revolution is transforming workplaces across Papua New Guinea and the wider Pacific region. Whether you're in banking, agriculture, or government, digital skills are becoming non-negotiable.</p>
<h2>Why Digital Skills Matter Now</h2><p>COVID-19 accelerated digital adoption across PNG. Businesses that moved online survived, while those that didn't struggled. This shift is permanent, and employers now expect basic digital literacy as a minimum.</p>
<h2>Essential Digital Skills for 2026</h2>
<ul><li><strong>Microsoft Office:</strong> Word, Excel, and PowerPoint remain fundamental across all industries</li><li><strong>Email & Online Communication:</strong> Professional email etiquette, video conferencing (Zoom, Teams)</li><li><strong>Social Media:</strong> Understanding platforms for business use, content creation, and digital marketing</li><li><strong>Data Management:</strong> Basic database skills, data entry accuracy, and reporting</li><li><strong>Cybersecurity Awareness:</strong> Protecting company data, recognizing phishing, password security</li></ul>
<h2>Advanced Digital Skills</h2><p>For those looking to specialise, consider learning web development (HTML, CSS, JavaScript), mobile app development, cloud computing, or data analytics. These skills command premium salaries in PNG.</p>
<h2>Where to Learn</h2><p>Online platforms like Coursera, edX, and Google Digital Garage offer free courses. Locally, institutions like UPNG's School of Business and IBHRD offer ICT programs. Many skills can be self-taught through YouTube tutorials and practice.</p>
<h2>The PNG Government Push</h2><p>The government's Digital Transformation Policy is creating demand for digitally skilled workers across all government departments. This represents a massive opportunity for tech-savvy PNG nationals.</p>`
  },
  {
    title: "Starting Your Career in PNG: A Graduate's Guide",
    slug: "starting-career-png-graduates-guide",
    excerpt: "Just graduated? Welcome to the workforce! Here's your practical guide to launching a successful career in Papua New Guinea.",
    category: "job-search-tips",
    tags: "graduates,career-start,advice,png",
    content: `<p>Congratulations on your graduation! Whether you've just finished at UPNG, Unitech, Divine Word University, or any other institution, the journey from graduate to professional can feel daunting. Here's your roadmap.</p>
<h2>Start Before You Graduate</h2><p>If you're still studying, seek internships and volunteer opportunities. Practical experience — even unpaid — gives you an edge over other fresh graduates. Many PNG employers hire directly from their internship programs.</p>
<h2>Build Your Professional Network</h2><p>In PNG, relationships matter. Attend industry events, join professional associations, and connect with alumni. The wantok system can be helpful, but make sure you also build professional connections beyond your immediate network.</p>
<h2>Create Your WantokJobs Profile</h2><p>Set up a complete profile on WantokJobs with your education, skills, and a professional photo. Enable job alerts for your field so you're notified immediately when relevant positions are posted.</p>
<h2>Don't Be Too Picky — At First</h2><p>Your first job might not be your dream job, and that's okay. Focus on gaining experience, developing skills, and building your professional reputation. Entry-level roles in Port Moresby, Lae, or Mt Hagen all provide valuable experience.</p>
<h2>Consider These High-Growth Sectors</h2>
<ul><li>Banking & Financial Services (BSP, Kina Bank)</li><li>Telecommunications (Digicel, Telikom)</li><li>Mining & Resources (OK Tedi, Newcrest)</li><li>Government & Public Service</li><li>NGOs & Development Organizations</li></ul>
<h2>Essential First Steps</h2>
<ul><li>Get a Tax Identification Number (TIN) from the IRC</li><li>Open a bank account if you don't have one</li><li>Prepare a professional email address</li><li>Have your academic transcripts and certificates ready</li><li>Get a police clearance — many employers require one</li></ul>
<h2>Stay Positive and Persistent</h2><p>Job hunting in PNG can take time. Don't get discouraged by rejections. Each application and interview is practice. Keep learning, keep networking, and the right opportunity will come. Em nau tasol — your time is coming!</p>`
  },
];

// Seed articles
const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminUser) { console.error('No admin user found'); process.exit(1); }

const existing = db.prepare('SELECT COUNT(*) as n FROM articles').get().n;
if (existing > 0) {
  console.log(`Already ${existing} articles exist. Skipping seed.`);
  process.exit(0);
}

const insert = db.prepare(`
  INSERT INTO articles (author_id, title, slug, content, excerpt, category, tags, status, published_at, ai_generated)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'), 1)
`);

let count = 0;
for (const a of articles) {
  try {
    insert.run(adminUser.id, a.title, a.slug, a.content, a.excerpt, a.category, a.tags);
    count++;
  } catch (e) {
    console.error(`Failed: ${a.slug} — ${e.message}`);
  }
}

console.log(`✅ Seeded ${count} articles`);
