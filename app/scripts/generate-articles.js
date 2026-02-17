#!/usr/bin/env node
/**
 * Generate 10 SEO blog articles for WantokJobs PNG job market.
 * Inserts into the `articles` table with status='published'.
 */
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'server', 'data', 'wantokjobs.db'));

const articles = [
  {
    title: 'Top 10 In-Demand Jobs in Papua New Guinea 2026',
    slug: 'top-10-in-demand-jobs-png-2026',
    category: 'Career Advice',
    tags: 'jobs,career,PNG,2026,in-demand',
    excerpt: 'Discover the most sought-after jobs in Papua New Guinea for 2026 and how to position yourself for these high-demand roles.',
    content: `<h2>Top 10 In-Demand Jobs in Papua New Guinea 2026</h2>
<p>Papua New Guinea's economy continues to evolve, driven by its rich natural resources, expanding infrastructure projects, and a growing services sector. As we move through 2026, certain careers are emerging as particularly promising for job seekers across the country. Whether you're a fresh graduate or an experienced professional looking for a change, understanding which roles are in high demand can help you make smarter career decisions.</p>

<h3>1. Mining Engineers</h3>
<p>PNG's mining sector remains the backbone of the economy. With operations at Ok Tedi, Porgera, and the Wafi-Golpu project gaining momentum, qualified mining engineers are in extremely high demand. Salaries range from K80,000 to K250,000 annually depending on experience and the specific mine site. Employers look for candidates with degrees in mining or geological engineering and relevant field experience.</p>

<h3>2. Registered Nurses and Midwives</h3>
<p>Healthcare remains critically understaffed across PNG, particularly in rural provinces. The government's push to improve health outcomes means registered nurses and midwives are urgently needed. Opportunities exist in both urban hospitals and remote health centres, with many positions offering housing and allowances on top of base salary.</p>

<h3>3. ICT Specialists and Software Developers</h3>
<p>Digital transformation is accelerating in PNG. Banks, telcos like Digicel and Telikom, and government agencies are all investing heavily in technology. Software developers, network engineers, and cybersecurity specialists can command salaries of K60,000 to K150,000. Remote work options are also becoming more common in this field.</p>

<h3>4. Construction Project Managers</h3>
<p>Major infrastructure projects — from the Highlands Highway upgrades to new commercial developments in Port Moresby and Lae — require skilled project managers. Experience with large-scale civil engineering projects and knowledge of PNG's regulatory environment are key qualifications.</p>

<h3>5. Accountants and Financial Analysts</h3>
<p>Every growing business needs financial expertise. CPA-qualified accountants and financial analysts are sought after by mining companies, banks, NGOs, and government departments. Professional certifications from CPA PNG or international bodies significantly boost employability.</p>

<h3>6. Teachers and Education Specialists</h3>
<p>With PNG's young population — over 40% under 15 — education professionals are vital. Secondary school teachers in STEM subjects are especially needed, and the government has increased teacher training budgets. International schools in Port Moresby also offer competitive packages for qualified educators.</p>

<h3>7. Agricultural Officers and Agronomists</h3>
<p>Agriculture employs the majority of Papua New Guineans. Professionals who can help modernise farming practices, improve crop yields, and connect smallholders to markets are invaluable. Coffee, cocoa, and palm oil sectors are actively recruiting technical specialists.</p>

<h3>8. Pilots and Aviation Professionals</h3>
<p>PNG's challenging terrain makes aviation essential. Helicopter and fixed-wing pilots, aircraft maintenance engineers, and air traffic controllers remain in high demand. Airlines like Air Niugini and PNG Air regularly recruit, and charter companies serving resource projects offer premium pay.</p>

<h3>9. Human Resources Managers</h3>
<p>As businesses formalise and grow, HR professionals who understand PNG's Employment Act, workplace health and safety regulations, and talent development strategies are increasingly valued. This is a field where local knowledge provides a genuine competitive advantage.</p>

<h3>10. Environmental Scientists</h3>
<p>With growing emphasis on sustainable development and environmental compliance in mining and forestry, environmental scientists and EIS specialists are highly sought after. Companies need professionals who can navigate both international standards and PNG's unique ecological context.</p>

<h3>How to Position Yourself</h3>
<p>Regardless of which field interests you, focus on gaining recognised qualifications, building practical experience through internships or volunteer work, and networking within your industry. Register on <strong>WantokJobs</strong> to stay updated on the latest opportunities in these high-demand fields. The PNG job market rewards those who are prepared and proactive.</p>`
  },
  {
    title: 'How to Write a CV That Gets Noticed by PNG Employers',
    slug: 'how-to-write-cv-png-employers',
    category: 'Career Advice',
    tags: 'CV,resume,job application,PNG,tips',
    excerpt: 'Learn how to craft a compelling CV tailored to Papua New Guinea employers that will help you stand out from the competition.',
    content: `<h2>How to Write a CV That Gets Noticed by PNG Employers</h2>
<p>In Papua New Guinea's competitive job market, your CV is often the first — and sometimes only — chance to make an impression on a potential employer. Yet many job seekers submit generic, poorly formatted CVs that fail to showcase their true potential. This guide will help you create a CV that stands out and gets you to the interview stage.</p>

<h3>Understand What PNG Employers Want</h3>
<p>PNG employers, whether they're mining companies, banks, NGOs, or government departments, are looking for candidates who demonstrate relevant skills, reliability, and cultural fit. They receive dozens or even hundreds of applications for popular roles, so your CV needs to be clear, concise, and compelling from the very first line.</p>

<h3>Start With a Strong Personal Summary</h3>
<p>Begin your CV with a 3-4 sentence personal summary that highlights your key qualifications, years of experience, and what you bring to the role. Avoid vague statements like "hardworking individual seeking opportunities." Instead, be specific: "Qualified accountant with 5 years' experience in the PNG resources sector, specialising in financial reporting and tax compliance under the IRC framework."</p>

<h3>Tailor Your CV to Each Role</h3>
<p>One of the biggest mistakes PNG job seekers make is sending the same CV for every application. Take 15 minutes to customise your CV for each position. Read the job advertisement carefully and mirror the key requirements in your CV. If the ad asks for "experience managing community engagement programs," make sure that exact phrase appears in your work history if you have that experience.</p>

<h3>Structure Your Work Experience Effectively</h3>
<p>List your work experience in reverse chronological order — most recent job first. For each role, include:</p>
<ul>
<li><strong>Job title and company name</strong></li>
<li><strong>Dates of employment</strong> (month and year)</li>
<li><strong>Key responsibilities</strong> — use bullet points, not paragraphs</li>
<li><strong>Achievements</strong> — quantify where possible ("Reduced procurement costs by 15%")</li>
</ul>
<p>If you've worked in the informal sector, don't leave gaps. Frame your experience positively: "Managed a family-owned retail business serving 200+ customers weekly" sounds professional and demonstrates real skills.</p>

<h3>Highlight Your Education and Qualifications</h3>
<p>Include your highest qualification first. If you studied at UPNG, Unitech, Divine Word University, or another PNG institution, list the full name of the degree and the institution. If you have professional certifications (CPA PNG, IANZ, project management qualifications), list these prominently — they carry significant weight with employers.</p>

<h3>Include Relevant Skills</h3>
<p>Create a dedicated skills section. Include both technical skills (software proficiency, machinery operation, language skills) and soft skills (leadership, teamwork, communication). If you speak Tok Pisin, English, and a local language, mention all three — multilingual ability is valued in PNG's diverse workplace.</p>

<h3>References Matter in PNG</h3>
<p>In PNG's close-knit business community, references carry extra weight. Include at least two professional references with their full name, title, organisation, phone number, and email. Always ask permission before listing someone as a referee, and choose people who can speak specifically about your work performance.</p>

<h3>Formatting Tips</h3>
<ul>
<li>Keep your CV to 2-3 pages maximum</li>
<li>Use a clean, professional font (Arial, Calibri, or Times New Roman)</li>
<li>Include your phone number with the correct PNG country code (+675)</li>
<li>Use a professional email address — not "hotboy99@gmail.com"</li>
<li>Save as PDF to preserve formatting</li>
<li>Name the file professionally: "John_Kila_CV_2026.pdf"</li>
</ul>

<h3>Common Mistakes to Avoid</h3>
<p>Don't include your marital status, religion, or a photo unless specifically requested. Avoid listing every job you've ever had — focus on the most relevant. Don't exaggerate or lie about qualifications; PNG's professional community is small and dishonesty will be discovered. Finally, proofread carefully — spelling errors signal carelessness.</p>

<p>A strong CV opens doors. Take the time to get it right, upload it to <strong>WantokJobs</strong>, and start applying with confidence. Your next career opportunity could be one well-written CV away.</p>`
  },
  {
    title: 'Mining Jobs in PNG: Salary Guide & How to Apply',
    slug: 'mining-jobs-png-salary-guide-how-to-apply',
    category: 'Industry Insights',
    tags: 'mining,salary,PNG,careers,resources',
    excerpt: 'A comprehensive guide to mining careers in Papua New Guinea, including salary ranges, top employers, and application tips.',
    content: `<h2>Mining Jobs in PNG: Salary Guide & How to Apply</h2>
<p>Mining is the single largest contributor to Papua New Guinea's formal economy, accounting for roughly 26% of GDP and providing thousands of well-paying jobs. For many Papua New Guineans, a career in mining represents the best path to financial stability and professional growth. Here's everything you need to know about mining jobs in PNG in 2026.</p>

<h3>Overview of PNG's Mining Sector</h3>
<p>PNG is home to world-class mineral deposits including gold, copper, silver, and nickel. Major operations include the Ok Tedi copper-gold mine in Western Province, the Lihir gold mine in New Ireland, Ramu NiCo in Madang, and the Porgera gold mine in Enga Province which has resumed operations under the new Barrick-State partnership. The Wafi-Golpu project in Morobe Province is also progressing, promising thousands of new jobs in the coming years.</p>

<h3>Types of Mining Jobs</h3>
<p>Mining operations require a vast range of skills. Common roles include:</p>
<ul>
<li><strong>Underground and open-pit miners</strong> — Operating heavy equipment, drilling, blasting</li>
<li><strong>Mining engineers</strong> — Planning and optimising extraction operations</li>
<li><strong>Geologists and exploration staff</strong> — Surveying and sampling mineral deposits</li>
<li><strong>Heavy equipment operators</strong> — Driving haul trucks, excavators, loaders</li>
<li><strong>Processing plant operators</strong> — Running crushers, mills, and flotation circuits</li>
<li><strong>Maintenance technicians</strong> — Electrical, mechanical, and instrumentation</li>
<li><strong>Safety officers and environmental specialists</strong> — Ensuring compliance and worker safety</li>
<li><strong>Administrative and support staff</strong> — HR, finance, logistics, catering, medical</li>
</ul>

<h3>Salary Guide (Annual, Kina)</h3>
<p>Mining salaries in PNG are among the highest in the country. Here are typical ranges for 2026:</p>
<ul>
<li><strong>Entry-level labourer / trade assistant:</strong> K25,000 – K45,000</li>
<li><strong>Heavy equipment operator:</strong> K50,000 – K90,000</li>
<li><strong>Skilled tradesperson (electrician, fitter):</strong> K60,000 – K110,000</li>
<li><strong>Graduate engineer / geologist:</strong> K70,000 – K120,000</li>
<li><strong>Experienced mining engineer:</strong> K120,000 – K250,000</li>
<li><strong>Superintendent / senior manager:</strong> K200,000 – K400,000+</li>
<li><strong>Safety / environmental officer:</strong> K60,000 – K130,000</li>
</ul>
<p>These figures typically include base salary only. Most mine-site roles also come with benefits like free accommodation and meals on site, flights to and from your home province, medical insurance, and superannuation contributions — which can add 30-50% to the total package value.</p>

<h3>Roster Patterns</h3>
<p>Most PNG mines operate on fly-in/fly-out (FIFO) rosters. Common patterns are 2 weeks on / 2 weeks off, or 4 weeks on / 2 weeks off for more remote sites. During your roster on, you'll typically work 12-hour shifts. The time off is yours — many workers use it to spend time with family, pursue further education, or run side businesses.</p>

<h3>How to Get Into Mining</h3>
<p>For entry-level positions, a trade certificate from a recognised PNG institution (such as Don Bosco Technical School or PNG University of Technology) is often sufficient. For professional roles, a relevant degree is required. Key steps:</p>
<ol>
<li><strong>Get qualified</strong> — Complete relevant trade or degree qualifications</li>
<li><strong>Gain experience</strong> — Start with contractors or smaller operations if you can't get directly onto a major mine</li>
<li><strong>Get your clearances</strong> — Medical fitness certificate, police clearance, and relevant safety tickets (working at heights, confined space, first aid)</li>
<li><strong>Apply directly</strong> — Check the careers pages of Newcrest, Barrick, Ok Tedi Mining Limited, and Ramu NiCo</li>
<li><strong>Use WantokJobs</strong> — Many mining contractors and subcontractors advertise on our platform</li>
<li><strong>Network</strong> — Attend mining industry events and connect with professionals on LinkedIn</li>
</ol>

<h3>Landowner Preferences and Localisation</h3>
<p>Under PNG's mining policies, companies are required to give preference to landowners and locals from the project area, followed by other Papua New Guineans, before hiring expatriates. If you're from a mining project area, make sure to highlight this in your application — it can give you a significant advantage.</p>

<p>Mining careers in PNG offer excellent pay, structured career progression, and the chance to contribute to the nation's development. Start your search on <strong>WantokJobs</strong> today and take the first step toward a rewarding career in one of PNG's most important industries.</p>`
  },
  {
    title: 'Working in Port Moresby vs Lae: What to Expect',
    slug: 'working-port-moresby-vs-lae-what-to-expect',
    category: 'Living & Working',
    tags: 'Port Moresby,Lae,PNG,work life,comparison',
    excerpt: 'Considering a move for work? Compare working and living conditions in Papua New Guinea\'s two largest cities — Port Moresby and Lae.',
    content: `<h2>Working in Port Moresby vs Lae: What to Expect</h2>
<p>Papua New Guinea's two largest cities offer distinctly different working and living experiences. Whether you're relocating for a new job or deciding between offers, understanding the differences between Port Moresby (NCD) and Lae (Morobe Province) will help you make an informed decision. Let's break down what each city offers for working professionals.</p>

<h3>Port Moresby: The Capital City</h3>
<p>Port Moresby is PNG's capital and largest city, home to approximately 400,000 people. It's the centre of government, finance, and international business. Most major corporations, embassies, international NGOs, and government departments are headquartered here.</p>

<h4>Job Market</h4>
<p>The majority of PNG's formal sector jobs are in Port Moresby. Key employers include BSP Financial Group, Kumul Petroleum, government ministries, the Asian Development Bank, and numerous international organisations. The city offers the widest range of career opportunities, particularly in finance, law, government, IT, and professional services. Salaries tend to be 10-20% higher than equivalent roles in Lae.</p>

<h4>Cost of Living</h4>
<p>Port Moresby is notoriously expensive. Rental costs for a secure compound can range from K2,500 to K8,000 per fortnight for a modest to mid-range property. Groceries, particularly imported goods, are pricey. Many employers offer housing allowances to help offset these costs. Dining out is available at restaurants in Vision City, the Waterfront, and various hotels, but expect to pay K80-200+ per meal.</p>

<h4>Lifestyle</h4>
<p>The city has improved significantly in recent years. The Harbour City development, new shopping centres, and improved road networks have enhanced quality of life. However, security remains a consideration — most professionals live in gated compounds and use private transport. Weekend activities include the Royal Papua Yacht Club, Ela Beach, Nature Park, and various sports clubs.</p>

<h3>Lae: The Industrial Hub</h3>
<p>Lae is PNG's second-largest city and its industrial heart, with a population of around 150,000. Located in Morobe Province on the mainland, it serves as the gateway to the Highlands and hosts PNG's largest port.</p>

<h4>Job Market</h4>
<p>Lae's economy revolves around manufacturing, agriculture processing, logistics, and trade. Major employers include Lae Biscuit Company, SP Brewery, the Morobe Mining Joint Venture (Hidden Valley), and PNG University of Technology (Unitech). The city also serves as a base for many Highlands-focused businesses and mining support companies. While the job market is smaller than POM's, competition can be less intense.</p>

<h4>Cost of Living</h4>
<p>Living costs in Lae are generally 15-25% lower than Port Moresby. Rent is more affordable, and locally produced food (particularly fresh produce from the Highlands) is cheaper and more abundant. The main market near the port area is one of the best in the country. However, imported goods and specialty items are still expensive due to logistics costs.</p>

<h4>Lifestyle</h4>
<p>Lae offers a different pace of life. The Botanic Gardens (one of the finest in the Pacific) are a genuine treasure. The Morobe Show each October is a highlight. Access to the natural beauty of Morobe Province — beaches, rivers, and mountains — is easier and more affordable than getting out of Port Moresby. The community is somewhat smaller and more tight-knit.</p>

<h3>Key Comparisons</h3>
<ul>
<li><strong>Salary:</strong> POM pays more, but costs more. Net disposable income can be similar.</li>
<li><strong>Career growth:</strong> POM offers more diverse opportunities; Lae is strong for industrial and technical careers.</li>
<li><strong>Security:</strong> Both cities have security challenges; Lae has improved in recent years but still requires caution.</li>
<li><strong>Family life:</strong> Many professionals find Lae more family-friendly due to lower costs and a smaller community feel.</li>
<li><strong>Transport:</strong> Both cities have traffic congestion. POM has more taxi and rideshare options. Lae is more compact and easier to navigate.</li>
<li><strong>Climate:</strong> Lae is hotter and wetter. POM has a distinct dry season (May-November) which many find more comfortable.</li>
</ul>

<h3>Making Your Decision</h3>
<p>If you're career-driven and want maximum options, Port Moresby is the place to be. If you value a lower cost of living, a more relaxed environment, and work in industrial or technical fields, Lae has a lot to offer. Both cities are growing, and both have opportunities for ambitious professionals.</p>

<p>Whatever you choose, make sure you have a clear understanding of your employment package, including any allowances for housing, transport, and security. Browse opportunities in both cities on <strong>WantokJobs</strong> and find the right fit for your career and lifestyle.</p>`
  },
  {
    title: 'Interview Tips for PNG Job Seekers',
    slug: 'interview-tips-png-job-seekers',
    category: 'Career Advice',
    tags: 'interview,tips,job seekers,PNG,career',
    excerpt: 'Prepare for your next job interview with these practical tips tailored specifically for the Papua New Guinea job market.',
    content: `<h2>Interview Tips for PNG Job Seekers</h2>
<p>You've submitted your CV, and the phone rings — you've been called for an interview. This is your chance to turn an application into a job offer. In Papua New Guinea's job market, interviews can range from informal chats to structured panel assessments. Here's how to prepare for and ace any type of interview you might face.</p>

<h3>Before the Interview</h3>

<h4>Research the Organisation</h4>
<p>This is non-negotiable. Before you walk in, you should know what the company does, who their major clients or stakeholders are, and any recent news about them. For PNG organisations, check their website, Facebook page, and recent Post-Courier or The National articles. If it's a mining company, know which sites they operate. If it's an NGO, understand their programs. Interviewers can immediately tell when a candidate hasn't done their homework.</p>

<h4>Understand the Role</h4>
<p>Re-read the job advertisement carefully. Identify the key selection criteria and prepare specific examples from your experience that demonstrate each one. Use the STAR method: describe the <strong>Situation</strong>, the <strong>Task</strong> you faced, the <strong>Action</strong> you took, and the <strong>Result</strong> you achieved.</p>

<h4>Prepare Your Documents</h4>
<p>Bring printed copies of your CV, academic transcripts, certificates, and reference letters. In PNG, employers often want to sight original documents. Organise everything in a neat folder — this shows professionalism before you even say a word.</p>

<h4>Plan Your Journey</h4>
<p>Whether the interview is in Port Moresby, Lae, or elsewhere, plan to arrive 15-20 minutes early. Account for traffic, PMV delays, and security check-in at office buildings. Being late to an interview in PNG is a serious negative — it suggests you'll be late to work.</p>

<h3>During the Interview</h3>

<h4>First Impressions Count</h4>
<p>Dress professionally. For men, this typically means long trousers, a collared shirt, and closed shoes. For women, modest professional attire — a blouse and skirt or trousers. Avoid excessive jewellery or strong perfume. Greet the interviewer with a firm handshake, eye contact, and a genuine smile.</p>

<h4>Common Interview Questions in PNG</h4>
<p>Be prepared for these frequently asked questions:</p>
<ul>
<li>"Tell us about yourself" — Keep it professional and relevant. 2 minutes maximum.</li>
<li>"Why do you want this job?" — Connect your goals to the organisation's mission.</li>
<li>"What are your strengths and weaknesses?" — Be honest. For weaknesses, show what you're doing to improve.</li>
<li>"Where do you see yourself in five years?" — Show ambition but be realistic.</li>
<li>"Why should we hire you over other candidates?" — This is your chance to sell yourself. Be specific about what you bring.</li>
<li>"Tell us about a challenging situation at work and how you handled it." — Use the STAR method here.</li>
</ul>

<h4>Panel Interviews</h4>
<p>Many PNG organisations, especially government and large companies, use panel interviews with 3-5 interviewers. Address each panel member when responding — not just the person who asked the question. Make eye contact with everyone. It's common for panels to include an HR representative, the hiring manager, and a senior staff member.</p>

<h4>Ask Questions</h4>
<p>When asked "Do you have any questions for us?" — always say yes. Good questions include: "What does a typical day look like in this role?" or "What are the main challenges facing the team right now?" or "What opportunities for professional development does the organisation offer?" This shows genuine interest and initiative.</p>

<h3>After the Interview</h3>

<h4>Follow Up</h4>
<p>Send a brief thank-you email within 24 hours. This is uncommon in PNG, which means it will make you stand out. A simple message: "Thank you for the opportunity to interview for [role]. I enjoyed learning about [something specific discussed]. I'm very interested in the position and look forward to hearing from you."</p>

<h4>Be Patient but Persistent</h4>
<p>Recruitment in PNG can take longer than expected. If you haven't heard back within the stated timeframe, a polite follow-up call or email is appropriate. Don't call every day — once a week at most.</p>

<h3>Cultural Considerations</h3>
<p>In PNG's workplace culture, humility and respect matter. While you should sell your abilities, avoid coming across as arrogant. Acknowledge the contributions of teams you've worked with. If you're from the same province or region as the interviewer, it's natural for this to come up, but don't rely on wantok connections to carry you through — demonstrate your merit first.</p>

<p>Preparation is the difference between a nervous candidate and a confident one. Put in the work before your interview, and you'll walk in knowing you've given yourself the best possible chance. Good luck — and browse <strong>WantokJobs</strong> for your next opportunity.</p>`
  },
  {
    title: 'Understanding Employment Laws in Papua New Guinea',
    slug: 'understanding-employment-laws-papua-new-guinea',
    category: 'Legal & Compliance',
    tags: 'employment law,PNG,workers rights,legal,compliance',
    excerpt: 'A plain-language guide to Papua New Guinea\'s key employment laws and what they mean for both workers and employers.',
    content: `<h2>Understanding Employment Laws in Papua New Guinea</h2>
<p>Whether you're an employee wanting to know your rights or an employer ensuring compliance, understanding PNG's employment laws is essential. Papua New Guinea's labour legislation provides important protections for workers while setting clear obligations for employers. Here's a plain-language guide to the key laws you need to know.</p>

<h3>The Employment Act 1978</h3>
<p>This is the primary legislation governing employment relationships in PNG. It covers most private sector employees and establishes minimum standards for contracts, wages, hours, leave, and termination. Key provisions include:</p>

<h4>Employment Contracts</h4>
<p>All employees should have a written contract of employment. The contract must specify the nature of the work, the rate of pay, the hours of work, and any other terms and conditions. Verbal agreements are legally binding in PNG but harder to enforce — always insist on a written contract. Contracts can be for a fixed term or ongoing (permanent).</p>

<h4>Working Hours</h4>
<p>The standard working week under the Employment Act is 42 hours for most workers, typically spread over five or six days. Any hours worked beyond this are considered overtime and must be compensated at a higher rate — usually 1.5 times the normal rate for weekday overtime and double time for Sundays and public holidays.</p>

<h4>Minimum Wage</h4>
<p>PNG's minimum wage is set by the Minimum Wages Board. As of 2026, the national minimum wage is K3.50 per hour. While this is the legal floor, most formal sector jobs pay significantly above this. Employers who pay below the minimum wage are in breach of the law and can be penalised.</p>

<h3>Leave Entitlements</h3>
<p>PNG law provides for several types of leave:</p>
<ul>
<li><strong>Annual leave:</strong> Employees are entitled to 14 days of paid annual leave after 12 months of continuous service.</li>
<li><strong>Sick leave:</strong> 6 days of paid sick leave per year, subject to providing a medical certificate for absences of more than 2 consecutive days.</li>
<li><strong>Maternity leave:</strong> Female employees are entitled to 12 weeks of maternity leave (6 weeks before and 6 weeks after the expected delivery date). This is largely unpaid under the Employment Act, though many employers offer paid maternity leave as part of their benefits.</li>
<li><strong>Paternity leave:</strong> Not mandated by the Employment Act, but increasingly offered by progressive employers.</li>
<li><strong>Public holidays:</strong> PNG has approximately 12 gazetted public holidays per year. Employees required to work on these days are entitled to double pay.</li>
</ul>

<h3>Termination and Redundancy</h3>
<p>An employer can terminate an employee for valid reasons including poor performance, misconduct, or redundancy, but must follow proper procedures:</p>
<ul>
<li><strong>Notice period:</strong> Varies by length of service — typically 1 week for employees with less than 4 weeks service, 2 weeks for 4 weeks to 1 year, and 4 weeks for longer-serving employees. Either party can give notice.</li>
<li><strong>Unfair dismissal:</strong> Employees who believe they've been unfairly dismissed can lodge a complaint with the Department of Labour and Industrial Relations.</li>
<li><strong>Redundancy:</strong> When a position is genuinely no longer needed, the employer must provide appropriate notice and redundancy pay calculated based on length of service.</li>
<li><strong>Summary dismissal:</strong> An employer can terminate without notice only for serious misconduct (theft, violence, wilful disobedience).</li>
</ul>

<h3>Industrial Relations Act</h3>
<p>This act governs trade unions, collective bargaining, and industrial disputes. Employees have the right to form and join trade unions. Disputes that cannot be resolved directly between employer and employee can be referred to the Department of Labour for conciliation or to the National Court if necessary.</p>

<h3>Workers' Compensation Act</h3>
<p>Employers are required to compensate employees who suffer injury or illness arising out of and in the course of their employment. This includes covering medical expenses and providing income replacement during recovery. Employers must carry workers' compensation insurance.</p>

<h3>Superannuation</h3>
<p>Under the Superannuation (General Provisions) Act, employers with 15 or more employees must contribute to a superannuation fund on behalf of their employees. Both employer and employee make contributions. The two major funds are Nambawan Super and Nasfund. These funds provide retirement savings and, in some cases, housing advance and education withdrawal options.</p>

<h3>What to Do If Your Rights Are Violated</h3>
<p>If you believe your employer is breaching employment law, you have several options:</p>
<ol>
<li>Raise the issue directly with your employer or HR department in writing.</li>
<li>Contact the Department of Labour and Industrial Relations — they have offices in major centres.</li>
<li>Seek advice from your trade union if you are a member.</li>
<li>Consult a lawyer specialising in employment law.</li>
</ol>

<p>Knowing your rights empowers you as a worker. Knowing your obligations protects you as an employer. For more career resources and job listings, visit <strong>WantokJobs</strong> — where PNG works.</p>`
  },
  {
    title: 'Best Industries to Work in PNG Right Now',
    slug: 'best-industries-work-png-right-now',
    category: 'Industry Insights',
    tags: 'industries,PNG,career,growth,economy',
    excerpt: 'Explore the top industries hiring in Papua New Guinea right now and where the best career opportunities lie.',
    content: `<h2>Best Industries to Work in PNG Right Now</h2>
<p>Papua New Guinea's economy is diverse and evolving. While mining has traditionally dominated, several other industries are experiencing significant growth and offering exciting career opportunities. If you're thinking about where to focus your job search or career development, here are the best industries to work in PNG right now.</p>

<h3>1. Mining and Resources</h3>
<p>It's impossible to talk about PNG's economy without starting here. Mining contributes around 26% of GDP and remains the highest-paying industry for most roles. With the Porgera mine back in operation, Wafi-Golpu advancing, and continued production at Ok Tedi and Lihir, job opportunities are strong. The sector doesn't just need engineers — it requires accountants, HR professionals, environmental specialists, logistics coordinators, and thousands of support staff. If you can handle roster-based work in remote locations, the financial rewards are substantial.</p>

<h3>2. Oil and Gas</h3>
<p>The PNG LNG project operated by ExxonMobil transformed the country's economy, and the sector continues to be a major employer. TotalEnergies' Papua LNG project is progressing, promising another wave of construction and operational jobs. Careers in oil and gas span engineering, operations, HSE (health, safety, and environment), project management, and community affairs. The upcoming expansion phase will create thousands of direct and indirect jobs over the next several years.</p>

<h3>3. Banking and Financial Services</h3>
<p>PNG's banking sector has been remarkably profitable and continues to grow. BSP Financial Group is one of the largest companies in the Pacific region. Kina Bank, MiBank, and other institutions are expanding their reach, particularly into digital banking and financial inclusion. Careers in banking offer stability, structured progression, and competitive benefits. Demand is strong for risk analysts, digital banking specialists, credit officers, and branch managers.</p>

<h3>4. Telecommunications and Technology</h3>
<p>Digital transformation is creating new opportunities across PNG. Digicel remains the largest mobile network operator, while Telikom PNG and bmobile are also investing in infrastructure. The rollout of 4G networks and growing internet penetration mean more demand for IT professionals, software developers, data analysts, and network engineers. Tech startups are also emerging in Port Moresby, offering entrepreneurial career paths.</p>

<h3>5. Agriculture and Agribusiness</h3>
<p>Agriculture employs around 80% of PNG's population, mostly in the informal sector. However, commercial agriculture is growing rapidly. Palm oil (through companies like New Britain Palm Oil Limited), coffee, cocoa, and fisheries offer formal employment with structured career paths. The government's push to add value locally — processing raw materials in PNG rather than exporting them — is creating new manufacturing and processing jobs.</p>

<h3>6. Construction and Infrastructure</h3>
<p>PNG is in the midst of a major infrastructure push. Road upgrades, port expansions, new commercial buildings, and housing developments are creating demand for civil engineers, project managers, surveyors, skilled tradespeople, and labourers. The Connect PNG road program alone is a multi-billion Kina initiative that will generate employment for years. Companies like Curtain Bros, Dekenai Constructions, and international firms are actively recruiting.</p>

<h3>7. Healthcare</h3>
<p>Healthcare is chronically understaffed across PNG, creating strong demand for qualified professionals. Doctors, nurses, pharmacists, lab technicians, and public health specialists are needed urgently, particularly outside of Port Moresby. The private healthcare sector is also growing, with Pacific International Hospital and other facilities expanding. Health sector salaries are improving, and many positions come with housing and other benefits.</p>

<h3>8. Education</h3>
<p>With a rapidly growing young population, PNG needs more teachers and education professionals than ever. Secondary school teachers, particularly in mathematics, science, and English, are in high demand. Opportunities exist in government schools, church-run institutions, and international schools. The University of PNG, PNG University of Technology, and other tertiary institutions also recruit academic staff. While pay in government schools can be modest, private and international school packages are competitive.</p>

<h3>9. Aviation and Logistics</h3>
<p>PNG's geography makes aviation and logistics critical sectors. Air Niugini, PNG Air, and numerous charter operators need pilots, engineers, and operations staff. On the logistics side, companies managing supply chains for mining operations, retail networks, and development projects require warehouse managers, transport coordinators, and procurement specialists. This sector offers diverse career paths and the chance to see different parts of this beautiful country.</p>

<h3>Where to Start</h3>
<p>Identify the industries that align with your skills and interests, then invest in relevant qualifications and experience. Use <strong>WantokJobs</strong> to search for current openings across all these sectors. The PNG job market rewards those who are informed, qualified, and proactive.</p>`
  },
  {
    title: 'How to Transition from Informal to Formal Employment in PNG',
    slug: 'transition-informal-to-formal-employment-png',
    category: 'Career Advice',
    tags: 'informal sector,formal employment,PNG,career transition,jobs',
    excerpt: 'Practical steps for Papua New Guineans looking to move from the informal economy into formal, salaried employment.',
    content: `<h2>How to Transition from Informal to Formal Employment in PNG</h2>
<p>In Papua New Guinea, the vast majority of working-age adults earn their living in the informal economy — through market selling, betel nut trade, subsistence farming, casual labour, or small unregistered businesses. While informal work provides essential income, formal employment offers benefits like regular salaries, superannuation, medical insurance, and legal protections. If you're looking to make the transition, here's a practical guide.</p>

<h3>Understanding the Gap</h3>
<p>The informal sector employs an estimated 85% of PNG's workforce. There's no shame in informal work — it feeds families and keeps communities running. However, the formal sector offers advantages that can change your long-term financial situation: predictable income, employer contributions to Nasfund or Nambawan Super, access to training, and career progression. Understanding what employers in the formal sector are looking for is the first step to bridging the gap.</p>

<h3>Step 1: Assess Your Existing Skills</h3>
<p>Don't underestimate what you already know. If you've been running a market stall, you have sales, customer service, cash handling, and inventory management experience. If you've been doing informal construction work, you have practical building skills. A buai (betel nut) trader who manages supply from multiple provinces has logistics and negotiation skills. Write down everything you can do — you'll be surprised how much translates to formal job requirements.</p>

<h3>Step 2: Get Documented</h3>
<p>Formal employers need documentation. Make sure you have:</p>
<ul>
<li><strong>National ID card</strong> — Apply through the National Identity Authority if you don't have one</li>
<li><strong>Birth certificate</strong> — Available from the Civil and Identity Registry</li>
<li><strong>Tax Identification Number (TIN)</strong> — Register with the Internal Revenue Commission (IRC)</li>
<li><strong>Bank account</strong> — Formal employers pay by bank transfer. Open an account with BSP, Kina Bank, or MiBank</li>
<li><strong>Police clearance</strong> — Required for most formal positions. Apply through the Royal PNG Constabulary</li>
</ul>
<p>Gathering these documents can take time, so start early. Having everything ready shows employers you're serious and organised.</p>

<h3>Step 3: Invest in Training and Qualifications</h3>
<p>Even basic qualifications can open doors. Consider:</p>
<ul>
<li><strong>Adult literacy and numeracy programs</strong> — If needed, these build essential foundations</li>
<li><strong>TVET (Technical and Vocational Education Training)</strong> — Institutions like Don Bosco, Australia Pacific Training Coalition (APTC), and various provincial TVET centres offer certificates in trades, hospitality, business administration, and more</li>
<li><strong>Short courses</strong> — First aid, food handling, forklift operation, basic computing — each of these makes you more employable</li>
<li><strong>Online learning</strong> — Free platforms like Coursera, Khan Academy, and YouTube tutorials can supplement formal training if you have internet access</li>
</ul>

<h3>Step 4: Build a CV from Informal Experience</h3>
<p>You don't need a corporate work history to have a CV. Frame your informal experience professionally:</p>
<ul>
<li>"Market vendor, Gordons Market (2019-2025)" becomes "Self-employed retail operator managing daily sales of K500+, inventory procurement, and customer relations"</li>
<li>"Casual builder" becomes "Construction worker with 5 years' experience in residential building, including concrete work, carpentry, and basic plumbing"</li>
</ul>
<p>Focus on responsibilities, skills used, and any measurable results. Get a literate friend or family member to help if needed, or visit a career support service.</p>

<h3>Step 5: Start With Entry-Level Formal Positions</h3>
<p>Your first formal job doesn't need to be your dream job. It needs to be your foot in the door. Entry-level positions that often welcome candidates from informal backgrounds include:</p>
<ul>
<li>Security guards (companies like Guard Dog, G4S)</li>
<li>Retail sales assistants (at supermarkets, hardware stores)</li>
<li>Hospitality staff (hotels, restaurants, catering companies)</li>
<li>Drivers (with a valid PNG driver's licence)</li>
<li>Cleaning and maintenance staff</li>
<li>Factory and warehouse workers</li>
</ul>

<h3>Step 6: Use Your Networks Wisely</h3>
<p>In PNG, the wantok system can be a genuine pathway to employment — but use it wisely. Let people know you're looking for formal work. Ask employed wantoks not just for a job, but for information: What qualifications did they need? How did they apply? Are there openings coming up? Networking in PNG is about relationships and trust, and these are things you've been building your whole life.</p>

<h3>Step 7: Register on Job Platforms</h3>
<p>Create a profile on <strong>WantokJobs</strong> and set up job alerts for roles that match your skills and location. Many employers now recruit online, even for entry-level positions. Having a digital presence shows initiative and makes it easier for recruiters to find you.</p>

<h3>Be Patient and Persistent</h3>
<p>The transition won't happen overnight. You might face rejections. Keep going. Every application, every course, every new connection moves you closer to your goal. Thousands of Papua New Guineans have made this transition successfully — and you can too.</p>`
  },
  {
    title: 'Remote Work Opportunities for Papua New Guineans',
    slug: 'remote-work-opportunities-papua-new-guineans',
    category: 'Career Advice',
    tags: 'remote work,digital,freelance,PNG,online jobs',
    excerpt: 'Explore how Papua New Guineans can access remote work opportunities and build careers in the growing digital economy.',
    content: `<h2>Remote Work Opportunities for Papua New Guineans</h2>
<p>The global shift toward remote work has created unprecedented opportunities for professionals worldwide — and Papua New Guineans are no exception. While challenges like internet connectivity and power reliability exist, a growing number of PNG professionals are successfully working remotely for local and international employers. Here's how you can tap into this trend.</p>

<h3>Why Remote Work Matters for PNG</h3>
<p>Papua New Guinea has a unique geographic challenge — much of the population lives in areas far from major employment centres. Remote work eliminates the need to relocate to Port Moresby or Lae for a good job. It also allows PNG professionals to access international job markets, earning in currencies that can significantly boost their purchasing power. For employers, remote work opens access to talent across all 22 provinces.</p>

<h3>In-Demand Remote Skills</h3>
<p>Certain skills are particularly well-suited to remote work. If you're looking to build a remote career, consider developing expertise in:</p>

<h4>Writing and Content Creation</h4>
<p>Content writers, copywriters, and blog writers are in high demand globally. If you write well in English, you can work for international clients through platforms like Upwork, Fiverr, and Freelancer. Topics like travel writing about PNG, business content, and academic writing are all viable niches. Rates range from US$10 to US$50+ per article depending on experience and topic.</p>

<h4>Graphic Design and Digital Media</h4>
<p>Designers who can create social media graphics, logos, marketing materials, and web designs are needed by businesses worldwide. Tools like Canva (free), Adobe Creative Suite, and Figma are industry standards. A strong portfolio is more important than formal qualifications in this field — start by designing for local businesses and building your body of work.</p>

<h4>Software Development and IT</h4>
<p>This is the highest-paying remote work category. Web developers, mobile app developers, and data analysts can earn K100,000+ annually working remotely for international clients. Languages like JavaScript, Python, and frameworks like React are particularly in demand. Free learning resources like freeCodeCamp and The Odin Project can get you started.</p>

<h4>Virtual Assistance</h4>
<p>Virtual assistants (VAs) provide administrative support to businesses and entrepreneurs remotely. Tasks include email management, scheduling, data entry, customer service, and social media management. This is an excellent entry point into remote work, requiring primarily good English, reliability, and basic computer skills. Filipino VAs dominate this market, but PNG professionals can compete on quality and the English language advantage.</p>

<h4>Online Tutoring and Teaching</h4>
<p>If you have teaching qualifications or expertise in a subject, online tutoring platforms like Tutor.com, Preply, and Cambly connect tutors with students globally. Teaching English online is particularly lucrative, with rates of US$15-30 per hour common for qualified teachers.</p>

<h3>Overcoming PNG-Specific Challenges</h3>

<h4>Internet Connectivity</h4>
<p>Reliable internet is the biggest challenge for remote workers in PNG. Solutions include:</p>
<ul>
<li>Digicel 4G mobile data with an external antenna for stronger signal</li>
<li>Kumul Telikom fixed broadband where available</li>
<li>Co-working spaces in Port Moresby (like Innovation Hub)</li>
<li>Satellite internet options (increasingly affordable)</li>
<li>Having a backup connection — always have a second provider ready</li>
</ul>

<h4>Power Supply</h4>
<p>Power outages are common across PNG. Invest in a UPS (uninterruptible power supply) for your computer and router. Solar panel systems are increasingly affordable and provide reliable backup power. Many remote workers keep their laptops charged and have portable power banks for their phones and mobile hotspots.</p>

<h4>Payment and Banking</h4>
<p>Receiving international payments can be tricky in PNG. Options include:</p>
<ul>
<li><strong>PayPal</strong> — Works in PNG for receiving payments, though withdrawal to local banks can have fees</li>
<li><strong>Wise (TransferWise)</strong> — Good rates for international transfers</li>
<li><strong>Direct bank transfer</strong> — Some international clients can pay directly to PNG bank accounts via SWIFT</li>
<li><strong>Cryptocurrency</strong> — Some freelancers use this, though it's not regulated in PNG</li>
</ul>

<h3>Getting Started</h3>
<ol>
<li><strong>Identify your marketable skills</strong> — What can you do that someone would pay for remotely?</li>
<li><strong>Build a portfolio</strong> — Even doing free work initially to have examples to show</li>
<li><strong>Create profiles</strong> — On Upwork, LinkedIn, and <strong>WantokJobs</strong></li>
<li><strong>Start small</strong> — Take on small projects to build your reputation and reviews</li>
<li><strong>Invest in your setup</strong> — Reliable internet, a decent laptop, and a quiet workspace</li>
<li><strong>Be professional</strong> — Meet deadlines, communicate clearly, and deliver quality work</li>
</ol>

<h3>Remote Jobs Within PNG</h3>
<p>It's not just international opportunities. Many PNG-based organisations are now offering remote or hybrid work arrangements, especially in IT, consulting, and professional services. Check <strong>WantokJobs</strong> for roles that offer remote work options. The trend is growing, and positioning yourself as remote-capable gives you an advantage in today's job market.</p>`
  },
  {
    title: 'Starting Your Career in PNG: A Guide for Fresh Graduates',
    slug: 'starting-career-png-guide-fresh-graduates',
    category: 'Career Advice',
    tags: 'graduates,first job,career start,PNG,university',
    excerpt: 'A practical guide for recent graduates from PNG universities on how to launch a successful career in Papua New Guinea.',
    content: `<h2>Starting Your Career in PNG: A Guide for Fresh Graduates</h2>
<p>Congratulations — you've graduated from UPNG, Unitech, Divine Word University, Pacific Adventist University, or one of PNG's other tertiary institutions. You have your degree, your transcript, and your ambition. Now what? The transition from university to the working world in Papua New Guinea can be challenging, but with the right approach, you can launch a successful career. Here's your guide.</p>

<h3>The Reality Check</h3>
<p>Let's be honest: PNG's formal job market is competitive. Each year, thousands of graduates enter a job market that can't absorb all of them immediately. This isn't meant to discourage you — it's meant to motivate you to be strategic. The graduates who find good jobs quickly are the ones who start preparing before they graduate, who are flexible about their first role, and who take initiative rather than waiting for opportunities to come to them.</p>

<h3>Start Before You Graduate</h3>
<p>If you're still in your final year, start now:</p>
<ul>
<li><strong>Industrial attachment / internships:</strong> If your program includes practical placements, take them seriously. Many employers hire their interns. Even if yours doesn't lead to a job, the experience and reference are invaluable.</li>
<li><strong>Networking:</strong> Attend career fairs, industry talks, and alumni events. Connect with professionals in your field. In PNG's small formal sector, who you know genuinely matters — not as a substitute for skill, but as a way to hear about opportunities.</li>
<li><strong>Part-time work:</strong> Any formal work experience — even unrelated to your degree — shows employers you understand workplace expectations.</li>
</ul>

<h3>Your First Job Doesn't Define Your Career</h3>
<p>This is perhaps the most important lesson for fresh graduates. Your first job is a stepping stone, not your final destination. Too many PNG graduates hold out for the "perfect" role while months or years slip by. A graduate accountant might start as an accounts clerk. An IT graduate might begin as a help desk officer. An engineering graduate might start with a contractor rather than the mine operator. What matters is that you're in the formal workforce, gaining experience, and building your reputation.</p>

<h3>Where to Look for Jobs</h3>
<ul>
<li><strong>WantokJobs</strong> — Our platform lists opportunities across all sectors and experience levels, including graduate positions</li>
<li><strong>Company websites</strong> — Major employers like BSP, Ok Tedi Mining, Digicel, and government departments post vacancies on their sites</li>
<li><strong>Newspapers</strong> — The Post-Courier and The National still carry significant job listings, particularly for government and NGO roles</li>
<li><strong>University career services</strong> — Many PNG universities have career offices that can connect graduates with employers</li>
<li><strong>Social media</strong> — LinkedIn and Facebook jobs groups (like "PNG Jobs" and "Port Moresby Jobs") are increasingly active</li>
<li><strong>Walk-ins</strong> — In PNG, physically visiting a company's HR department with your CV is still acceptable and sometimes effective</li>
</ul>

<h3>Building Your Professional Identity</h3>

<h4>Create a Strong CV</h4>
<p>As a graduate with limited experience, focus on your education, skills, university projects, volunteer work, and any practical attachments. Quantify achievements where possible: "Led a team of 4 students on a community development project in Sepik Province" is stronger than "Good teamwork skills."</p>

<h4>Get on LinkedIn</h4>
<p>LinkedIn is growing rapidly in PNG's professional community. Create a complete profile with a professional photo, your university details, skills, and a compelling summary. Follow companies you're interested in. Share and comment on relevant industry content. Recruiters in PNG increasingly use LinkedIn to find candidates.</p>

<h4>Develop Your Soft Skills</h4>
<p>Technical knowledge gets you shortlisted; soft skills get you hired. Focus on:</p>
<ul>
<li><strong>Communication</strong> — Both written and verbal, in English and Tok Pisin</li>
<li><strong>Punctuality</strong> — This is a deal-breaker for many PNG employers</li>
<li><strong>Professionalism</strong> — How you dress, speak, and conduct yourself</li>
<li><strong>Adaptability</strong> — Willingness to take on tasks outside your job description</li>
<li><strong>Initiative</strong> — Don't wait to be told what to do. Identify problems and propose solutions.</li>
</ul>

<h3>Consider Alternative Paths</h3>
<p>Not everyone needs to follow the traditional employment path. Consider:</p>
<ul>
<li><strong>Entrepreneurship:</strong> If you have a business idea, PNG's growing economy has room for innovators. Start small, test your concept, and grow.</li>
<li><strong>Volunteer work:</strong> Organisations like VSO and local NGOs offer structured volunteer programs that build experience and connections.</li>
<li><strong>Further study:</strong> If your field requires postgraduate qualifications, consider part-time study while working, or apply for scholarships (Australia Awards, NZ MFAT, Japan MEXT).</li>
<li><strong>Government graduate programs:</strong> Some government departments and SOEs run structured graduate intake programs. Watch for announcements.</li>
</ul>

<h3>Managing Your Finances</h3>
<p>Your first salary will feel like a fortune compared to student life, but be smart:</p>
<ul>
<li>Open a savings account and set aside at least 10% of every pay</li>
<li>Understand your superannuation — check your Nasfund or Nambawan Super account regularly</li>
<li>Be cautious with debt — avoid unnecessary loans and credit card spending</li>
<li>Support your family, but set boundaries — "wantok pressure" can drain a new salary quickly if you don't manage it</li>
</ul>

<h3>Stay Resilient</h3>
<p>Rejection is part of the process. You might apply for 20 jobs before you get one interview. That's normal. Each application teaches you something. Each interview makes you better at the next one. The Papua New Guinean economy needs your skills, your energy, and your ideas. Keep pushing.</p>

<p>Your career is a marathon, not a sprint. Start where you can, learn everything possible, and build toward where you want to be. Register on <strong>WantokJobs</strong> today and take the first step. Yu ken mekim!</p>`
  }
];

// Remove existing articles with these slugs first
const slugs = articles.map(a => a.slug);
const delStmt = db.prepare('DELETE FROM articles WHERE slug = ?');
for (const s of slugs) delStmt.run(s);

const insert = db.prepare(`
  INSERT INTO articles (author_id, title, slug, content, excerpt, category, tags, status, ai_generated, published_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'published', 1, datetime('now'))
`);

const insertAll = db.transaction((arts) => {
  for (const a of arts) {
    insert.run(1, a.title, a.slug, a.content, a.excerpt, a.category, a.tags);
  }
});

insertAll(articles);
console.log(`Inserted ${articles.length} articles successfully.`);
db.close();
