#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'server', 'data', 'wantokjobs.db'));

const articles = [
  {
    title: "Top 10 In-Demand Jobs in Papua New Guinea 2026",
    slug: "top-10-in-demand-jobs-papua-new-guinea-2026",
    category: "career-advice",
    tags: "jobs,png,career,2026,in-demand",
    excerpt: "Discover the top 10 most in-demand jobs in Papua New Guinea for 2026, from mining engineers to IT professionals, and learn how to position yourself for success.",
    content: `<h2>The PNG Job Market Is Evolving — Are You Ready?</h2>
<p>Papua New Guinea's economy continues to diversify beyond its traditional resource-based industries. As we move through 2026, new opportunities are emerging across multiple sectors. Whether you're a fresh graduate or an experienced professional looking for a career change, understanding which jobs are in high demand can give you a significant competitive advantage.</p>

<h3>1. Mining Engineers</h3>
<p>PNG's mining sector remains the backbone of the economy. With major projects like Wafi-Golpu and the expansion of Ok Tedi, qualified mining engineers are in extremely high demand. Salaries range from K80,000 to K250,000 annually depending on experience and specialisation. Companies actively seek candidates with degrees in mining engineering, geological engineering, or related fields.</p>

<h3>2. Healthcare Professionals</h3>
<p>Doctors, nurses, and allied health workers are critically needed across PNG, especially in rural provinces. The government's push to improve healthcare infrastructure means more positions are opening at hospitals, clinics, and community health centres. Registered nurses can expect starting salaries around K35,000-K55,000.</p>

<h3>3. IT and Software Developers</h3>
<p>Digital transformation is accelerating across PNG businesses. Companies need web developers, database administrators, and cybersecurity specialists. The rise of mobile banking and e-commerce platforms like those serving PNG's growing urban population means tech talent is increasingly valuable, with salaries often exceeding K60,000 for experienced developers.</p>

<h3>4. Accountants and Financial Analysts</h3>
<p>Every growing business needs strong financial management. CPA-qualified accountants and financial analysts are sought after by banks, resource companies, and government agencies. International firms operating in PNG often offer competitive packages including housing and travel allowances.</p>

<h3>5. Teachers and Education Specialists</h3>
<p>With PNG's young population — over 40% under 15 — the demand for qualified teachers is enormous. Both primary and secondary teachers are needed, particularly in STEM subjects. International schools in Port Moresby and Lae offer premium salaries for experienced educators.</p>

<h3>6. Agricultural Specialists</h3>
<p>Agriculture employs around 85% of PNG's population. Modern agricultural specialists who can improve crop yields, manage supply chains, and introduce sustainable farming practices are highly valued. Roles range from agronomists to agricultural extension officers.</p>

<h3>7. Construction Project Managers</h3>
<p>Infrastructure development is booming across PNG. From new highways to commercial buildings and government projects, experienced project managers with construction backgrounds are essential. Expect salaries between K70,000 and K150,000 for qualified professionals.</p>

<h3>8. Human Resources Managers</h3>
<p>As PNG companies grow and formalise their operations, professional HR management becomes critical. HR managers who understand PNG's Employment Act, workplace health and safety requirements, and talent development strategies are in strong demand across all industries.</p>

<h3>9. Logistics and Supply Chain Coordinators</h3>
<p>PNG's challenging geography makes logistics a complex and essential function. Professionals who can manage supply chains across islands, highlands, and coastal regions are invaluable to mining companies, retailers, and aid organisations alike.</p>

<h3>10. Telecommunications Engineers</h3>
<p>With Digicel, Telikom PNG, and new players expanding mobile and internet coverage, telecommunications engineers are needed to build and maintain PNG's growing digital infrastructure. This includes roles in network planning, tower construction, and fibre optic installation.</p>

<h3>How to Position Yourself</h3>
<p>To land one of these in-demand roles, focus on gaining relevant qualifications from recognised institutions, building practical experience through internships or volunteer work, and networking with industry professionals. Register on WantokJobs to receive alerts when these positions become available in your area.</p>

<p>The PNG job market is full of opportunity for those who are prepared. Start your job search today and take the next step in your career journey.</p>`
  },
  {
    title: "How to Write a CV That Gets Noticed by PNG Employers",
    slug: "how-to-write-cv-gets-noticed-png-employers",
    category: "job-search-tips",
    tags: "cv,resume,job-search,tips,png",
    excerpt: "Learn how to craft a professional CV that stands out to Papua New Guinea employers with practical tips on formatting, content, and common mistakes to avoid.",
    content: `<h2>Your CV Is Your First Impression — Make It Count</h2>
<p>In Papua New Guinea's competitive job market, your CV is often the only thing standing between you and an interview. Many qualified candidates miss out on opportunities simply because their CV fails to communicate their value effectively. This guide will help you create a CV that captures attention and gets you shortlisted.</p>

<h3>Understanding What PNG Employers Want</h3>
<p>PNG employers, whether they're multinational resource companies or local SMEs, look for CVs that are clear, concise, and relevant. They typically spend less than 30 seconds on an initial scan, so your CV needs to make an immediate impact. Employers want to quickly see your qualifications, relevant experience, and what you can bring to their organisation.</p>

<h3>The Right Format</h3>
<p>Use a reverse-chronological format — list your most recent experience first. Keep your CV to a maximum of two to three pages. Use a clean, professional font like Arial or Calibri at 11-12 point size. Include clear section headings and consistent formatting throughout. Avoid decorative borders, colours, or unusual fonts that can look unprofessional.</p>

<h3>Essential Sections</h3>
<p><strong>Contact Information:</strong> Include your full name, phone number, email address, and city/province. Make sure your email address is professional — avoid nicknames or joke addresses. If you have a LinkedIn profile, include the URL.</p>

<p><strong>Professional Summary:</strong> Write two to three sentences at the top summarising your experience, key skills, and career goals. Tailor this for each application. For example: "Experienced accountant with 5 years in the mining sector, skilled in financial reporting and compliance under PNG taxation law. Seeking a senior finance role where I can contribute to organisational growth."</p>

<p><strong>Work Experience:</strong> For each role, include the job title, company name, location, and dates. Use bullet points to describe your responsibilities and achievements. Start each bullet with an action verb — managed, developed, implemented, achieved. Quantify your achievements where possible: "Managed a team of 12 staff" or "Reduced procurement costs by 15%."</p>

<p><strong>Education:</strong> List your qualifications from most recent to oldest. Include the institution name, qualification, and year of completion. If you graduated from a PNG institution like UPNG, Unitech, or Divine Word University, state it clearly — local employers value local qualifications.</p>

<p><strong>Skills:</strong> List relevant technical and soft skills. Be specific: instead of "computer skills," write "Proficient in Microsoft Excel, SAP, and MYOB." Include language skills — many PNG employers value candidates who speak Tok Pisin, English, and a local language.</p>

<h3>Common Mistakes to Avoid</h3>
<p><strong>Spelling and grammar errors:</strong> These signal carelessness. Proofread carefully or ask someone to review your CV. <strong>Including irrelevant information:</strong> Your hobbies and marital status are generally not needed. <strong>Using a generic CV for every application:</strong> Tailor your CV to match each job description. <strong>Listing duties instead of achievements:</strong> Employers want to know what you accomplished, not just what you were supposed to do.</p>

<h3>Tips Specific to PNG</h3>
<p>If applying to resource sector companies, highlight any safety certifications or site experience. For government roles, mention your understanding of public service procedures. Include references from respected community or business leaders when possible — relationships matter in PNG's professional culture.</p>

<p>Always include a cover letter alongside your CV unless the job listing says otherwise. A well-written cover letter shows genuine interest and gives you space to explain why you're the right fit for the role.</p>

<p>Ready to put your new CV to work? Browse the latest jobs on WantokJobs and start applying today.</p>`
  },
  {
    title: "Mining Jobs in PNG: Salary Guide & How to Apply",
    slug: "mining-jobs-png-salary-guide-how-to-apply",
    category: "industry-news",
    tags: "mining,salary,jobs,png,career",
    excerpt: "A comprehensive guide to mining jobs in Papua New Guinea, including salary ranges for key roles, top employers, and step-by-step advice on how to apply.",
    content: `<h2>Mining Remains PNG's Premier Employment Sector</h2>
<p>The mining and resources sector is the largest contributor to Papua New Guinea's formal economy, accounting for approximately 26% of GDP and providing thousands of direct and indirect jobs. For many Papua New Guineans, a career in mining offers some of the highest salaries and best benefits available in the country. Here's everything you need to know about mining jobs in PNG.</p>

<h3>Major Mining Operations in PNG</h3>
<p>PNG hosts several world-class mining operations. <strong>Ok Tedi Mine</strong> in Western Province is one of the largest copper and gold mines in the world. <strong>Lihir Gold Mine</strong> in New Ireland Province is among the top gold producers globally. <strong>Porgera Gold Mine</strong> in Enga Province recently reopened under a new partnership structure. The upcoming <strong>Wafi-Golpu</strong> project in Morobe Province promises to create thousands of new jobs over the coming decade.</p>

<h3>Salary Ranges by Role</h3>
<p>Mining salaries in PNG are among the most competitive in the Pacific region. Here's what you can expect:</p>

<p><strong>Entry-Level Roles:</strong> Mine labourers and operators typically earn K25,000 to K45,000 per year. These roles often require minimal formal qualifications but demand physical fitness and willingness to work in remote locations.</p>

<p><strong>Trades and Technical:</strong> Electricians, mechanics, and plant operators earn K45,000 to K80,000 annually. Holding trade certificates from recognised institutions significantly boosts your earning potential. Heavy equipment operators with experience on haul trucks and excavators are particularly sought after.</p>

<p><strong>Professional Roles:</strong> Geologists, mining engineers, and environmental scientists earn K80,000 to K180,000. These roles require university qualifications and typically several years of experience. Graduates from the PNG University of Technology (Unitech) are well-regarded by mining employers.</p>

<p><strong>Management:</strong> Mine managers, project directors, and senior technical advisors can earn K150,000 to K350,000 or more. These positions require extensive experience and often involve managing large teams and significant budgets.</p>

<h3>Benefits Beyond Salary</h3>
<p>Mining companies in PNG typically offer comprehensive benefits packages that include accommodation at mine sites or housing allowances in nearby towns, meal allowances, flights to and from site (usually on a fly-in fly-out roster), medical insurance, superannuation contributions above the legal minimum, and annual leave airfares. Many companies also provide education assistance for employees' children.</p>

<h3>How to Apply for Mining Jobs</h3>
<p><strong>Step 1: Get Qualified.</strong> Determine what qualifications your target role requires. For trades, complete a relevant certificate at a TVET institution. For professional roles, pursue a degree at UPNG, Unitech, or an accredited overseas university.</p>

<p><strong>Step 2: Gain Experience.</strong> Many mining companies offer graduate programs and apprenticeships. Apply for these early — competition is fierce. Internships during your studies can give you a significant advantage.</p>

<p><strong>Step 3: Get Certified.</strong> Obtain relevant safety certifications such as a General Induction (GI) card, first aid certification, and any role-specific tickets. Many sites require a current medical clearance.</p>

<p><strong>Step 4: Apply Strategically.</strong> Register on WantokJobs and set up alerts for mining positions. Also check the career pages of companies like Newcrest, Barrick (Porgera), Ok Tedi Mining Limited, and Harmony Gold directly. Tailor your CV for each application, highlighting relevant experience and certifications.</p>

<p><strong>Step 5: Network.</strong> Many mining jobs are filled through referrals. Attend industry events, join professional associations like the PNG Chamber of Mines and Petroleum, and connect with mining professionals on LinkedIn.</p>

<h3>Landowner Positions</h3>
<p>Mining companies are required to prioritise employment for landowners in their project areas. If you're from a community near a mining operation, contact the company's community affairs department to learn about available opportunities and training programs.</p>

<p>The mining sector continues to offer exceptional career opportunities for Papua New Guineans at all levels. Start your mining career search on WantokJobs today.</p>`
  },
  {
    title: "Working in Port Moresby vs Lae: What to Expect",
    slug: "working-port-moresby-vs-lae-what-to-expect",
    category: "career-advice",
    tags: "port-moresby,lae,work,lifestyle,png",
    excerpt: "Comparing work and life in Papua New Guinea's two largest cities — Port Moresby and Lae — covering salaries, cost of living, industries, and lifestyle.",
    content: `<h2>PNG's Two Biggest Cities Offer Different Career Paths</h2>
<p>When considering where to build your career in Papua New Guinea, the choice often comes down to the nation's two largest cities: Port Moresby, the capital, and Lae, the industrial hub of Morobe Province. Each city offers distinct advantages and challenges. Understanding these differences can help you make an informed decision about where to work and live.</p>

<h3>Port Moresby: The Capital Advantage</h3>
<p>Port Moresby is PNG's political and commercial capital, home to approximately 400,000 people. It's where you'll find the headquarters of most government agencies, international organisations, banks, and major corporations. If you're pursuing a career in government, finance, law, diplomacy, or corporate management, Port Moresby is where the opportunities are concentrated.</p>

<p><strong>Key Industries:</strong> Government and public administration, banking and financial services, professional services (legal, accounting, consulting), international development and NGOs, oil and gas company headquarters, and retail and hospitality.</p>

<p><strong>Salaries:</strong> Port Moresby generally offers higher salaries than other PNG cities, reflecting the higher cost of living. Entry-level professional roles start around K30,000-K45,000, while experienced professionals in banking or corporate roles can earn K80,000-K200,000 or more.</p>

<p><strong>Cost of Living:</strong> Port Moresby is one of the most expensive cities in the Pacific. Rental costs are particularly high — a modest apartment in a secure compound can cost K2,000-K5,000 per fortnight. Groceries, dining, and transport are also significantly more expensive than in other PNG cities. Many employers offset this with housing allowances.</p>

<h3>Lae: The Industrial Powerhouse</h3>
<p>Lae is PNG's second-largest city and its industrial heart, with a population of around 150,000. Located on the Huon Gulf, it serves as the gateway to the Highlands region and is a major port and manufacturing centre. If your career is in manufacturing, agriculture, logistics, or mining services, Lae may offer better prospects.</p>

<p><strong>Key Industries:</strong> Manufacturing and processing, agriculture and agribusiness (coffee, cocoa, palm oil), logistics and shipping, mining services and supply, construction, and retail trade.</p>

<p><strong>Salaries:</strong> Salaries in Lae are generally 10-20% lower than equivalent roles in Port Moresby. However, the lower cost of living means your money goes further. Entry-level roles start around K25,000-K38,000, with experienced professionals earning K50,000-K120,000 depending on the industry.</p>

<p><strong>Cost of Living:</strong> Lae is noticeably more affordable than Port Moresby. Rent is lower, fresh produce from the Highlands is cheaper and more abundant, and daily expenses are more manageable. This makes Lae attractive for professionals who want to save more of their income.</p>

<h3>Lifestyle Comparison</h3>
<p><strong>Port Moresby</strong> offers more in terms of entertainment, dining, and international amenities. You'll find shopping centres like Vision City, international restaurants, and social clubs. However, security concerns mean most professionals live in gated compounds and exercise caution when moving around the city.</p>

<p><strong>Lae</strong> has a smaller-town feel with a tight-knit professional community. The Botanic Gardens and proximity to natural attractions like the Finisterre Range offer outdoor recreation. The community is smaller, so networking happens more naturally. Security is also a concern but the city's smaller size can feel more manageable.</p>

<h3>Career Growth</h3>
<p>Port Moresby offers more diverse career paths and greater opportunities for advancement, particularly in corporate and government roles. Lae, however, can offer faster progression in industrial and manufacturing roles due to less competition for positions. Many professionals start their careers in Lae to gain experience before moving to Port Moresby for senior roles.</p>

<h3>Making Your Choice</h3>
<p>Consider your industry, career goals, family situation, and lifestyle preferences. Some professionals alternate between both cities throughout their careers. The good news is that both cities have growing job markets with real opportunities for ambitious Papua New Guineans.</p>

<p>Search for jobs in both Port Moresby and Lae on WantokJobs to compare what's available in your field.</p>`
  },
  {
    title: "Interview Tips for PNG Job Seekers",
    slug: "interview-tips-png-job-seekers-2026",
    category: "job-search-tips",
    tags: "interview,tips,job-search,png,career",
    excerpt: "Practical interview tips tailored for Papua New Guinea job seekers, covering preparation, common questions, cultural considerations, and follow-up strategies.",
    content: `<h2>Ace Your Next Job Interview in PNG</h2>
<p>Getting called for an interview is an exciting milestone in your job search. It means your CV impressed the employer enough to want to meet you in person. Now it's time to prepare thoroughly so you can present yourself as the best candidate for the role. These tips are specifically tailored for the PNG job market and will help you walk into any interview with confidence.</p>

<h3>Before the Interview: Preparation Is Everything</h3>
<p><strong>Research the company:</strong> Learn everything you can about the organisation. Visit their website, read recent news articles, and understand their products, services, and mission. If it's a PNG company, understand their role in the local economy. If it's a multinational, know about their PNG operations specifically.</p>

<p><strong>Understand the role:</strong> Re-read the job description carefully. Identify the key requirements and think about specific examples from your experience that demonstrate you meet each one. Write these examples down and practise talking about them.</p>

<p><strong>Prepare your documents:</strong> Bring multiple copies of your CV, your academic certificates, and any professional certifications. In PNG, employers often want to see original documents, so have these ready in a neat folder or portfolio.</p>

<p><strong>Plan your journey:</strong> Port Moresby and Lae traffic can be unpredictable. Plan to arrive at least 20-30 minutes early. Know the exact location and have a contact number in case you need directions. Account for security check-in procedures at office buildings.</p>

<h3>During the Interview: Making a Strong Impression</h3>
<p><strong>Dress professionally:</strong> For corporate roles, wear formal business attire. Men should wear a collared shirt and trousers (a tie for senior roles), and women should opt for professional business wear. For trades or field positions, smart casual is usually appropriate. When in doubt, dress more formally rather than less.</p>

<p><strong>Greet confidently:</strong> Offer a firm handshake, make eye contact, and smile. In PNG's professional culture, showing respect through your greeting sets a positive tone. Address interviewers formally unless they invite you to use first names.</p>

<p><strong>Answer with the STAR method:</strong> For behavioural questions like "Tell me about a time when..." use the STAR format: <strong>Situation</strong> (set the scene), <strong>Task</strong> (your responsibility), <strong>Action</strong> (what you did), and <strong>Result</strong> (what happened). This structure keeps your answers focused and impactful.</p>

<h3>Common Interview Questions in PNG</h3>
<p>Be prepared for these frequently asked questions: "Tell me about yourself" — give a brief professional summary, not your life story. "Why do you want to work here?" — show you've researched the company. "What are your strengths and weaknesses?" — be honest but strategic. "Where do you see yourself in five years?" — show ambition aligned with the role. "Why did you leave your last job?" — be positive and forward-looking.</p>

<h3>Cultural Considerations</h3>
<p>PNG's professional culture values respect, community, and relationships. Show awareness of local customs while maintaining professionalism. If you speak Tok Pisin and the interviewer switches to it, follow their lead — it can help build rapport. However, maintain professional language throughout. Demonstrating that you understand and respect PNG's diverse cultural landscape is always a positive signal.</p>

<h3>Questions to Ask the Interviewer</h3>
<p>Always prepare questions to ask at the end. Good options include: "What does success look like in this role?" "What are the biggest challenges facing the team right now?" "What opportunities for professional development does the company offer?" "What is the typical career progression for this position?" Avoid asking about salary in the first interview unless the interviewer raises it.</p>

<h3>After the Interview: Follow Up</h3>
<p>Send a brief thank-you email within 24 hours, expressing your appreciation for the opportunity and reiterating your interest. If you don't hear back within the timeframe they mentioned, it's appropriate to follow up once with a polite email. Be patient — hiring processes in PNG can sometimes take longer than expected.</p>

<p>Prepare well, be yourself, and show genuine enthusiasm for the role. Browse interview-ready opportunities on WantokJobs today.</p>`
  },
  {
    title: "Understanding Employment Laws in Papua New Guinea",
    slug: "understanding-employment-laws-papua-new-guinea",
    category: "career-advice",
    tags: "employment-law,rights,png,workers,legal",
    excerpt: "A plain-language guide to Papua New Guinea's employment laws, covering worker rights, contracts, leave entitlements, termination, and minimum wage requirements.",
    content: `<h2>Know Your Rights as a Worker in PNG</h2>
<p>Understanding Papua New Guinea's employment laws is essential whether you're an employee wanting to know your rights or an employer ensuring compliance. PNG's employment framework is primarily governed by the Employment Act 1978, along with other legislation covering specific aspects of the employer-employee relationship. This guide breaks down the key provisions in plain language.</p>

<h3>The Employment Act 1978</h3>
<p>The Employment Act is the primary legislation governing employment relationships in PNG. It covers most employees in the private sector, though certain categories such as members of the Defence Force and public servants are covered by separate legislation. The Act sets out minimum standards that employers must meet — employment contracts can provide better conditions but cannot offer less than what the Act requires.</p>

<h3>Employment Contracts</h3>
<p>Every employee should have a written employment contract. The contract must specify the terms and conditions of employment, including the nature of the work, pay rate, hours of work, and duration of employment. Contracts can be for a fixed term or ongoing (permanent). Verbal agreements are legally binding but written contracts provide much better protection for both parties.</p>

<h3>Minimum Wage</h3>
<p>PNG has a national minimum wage that is reviewed periodically by the Minimum Wages Board. As of recent reviews, the minimum wage has been set at K3.50 per hour for urban areas. Rural minimum wages may differ. Employers who pay below the minimum wage are in breach of the law. If you believe you're being underpaid, you can lodge a complaint with the Department of Labour and Industrial Relations.</p>

<h3>Working Hours</h3>
<p>The standard working week in PNG is 42 hours for most industries, typically spread over five or six days. Overtime work must be compensated at higher rates: time-and-a-half for the first three hours beyond normal hours, and double time thereafter. Work on Sundays and public holidays also attracts premium pay rates.</p>

<h3>Leave Entitlements</h3>
<p><strong>Annual Leave:</strong> Employees are entitled to a minimum of 14 days of paid annual leave per year after completing 12 months of continuous service. <strong>Sick Leave:</strong> Workers are entitled to paid sick leave, generally six days per year, though employers may provide more. A medical certificate is usually required for absences of more than two days. <strong>Maternity Leave:</strong> Female employees are entitled to maternity leave, and it is unlawful to terminate a woman's employment because of pregnancy. <strong>Bereavement Leave:</strong> While not extensively detailed in the Act, many PNG employers provide compassionate leave for family bereavements, recognising the importance of community obligations.</p>

<h3>Termination and Redundancy</h3>
<p>Employers must provide adequate notice before terminating employment. Notice periods depend on the length of service and terms of the contract but are typically one to four weeks. Summary dismissal (without notice) is only permitted for serious misconduct such as theft, violence, or wilful disobedience. Employees who believe they were unfairly dismissed can seek recourse through the Department of Labour or the courts.</p>

<p>Redundancy payments are required when positions are eliminated. The standard calculation is typically two weeks' pay for each year of service, though specific terms may vary by contract or industry agreement.</p>

<h3>Workplace Safety</h3>
<p>Employers have a legal duty to provide a safe working environment. This is reinforced by the Industrial Safety, Health and Welfare Act. Workers have the right to refuse unsafe work and should report hazardous conditions to their supervisor or the relevant authorities without fear of retaliation.</p>

<h3>Discrimination</h3>
<p>PNG law prohibits discrimination in employment based on race, sex, religion, political opinion, or national extraction. The Constitution of PNG also guarantees equality. If you experience discrimination at work, document the incidents and seek advice from the Department of Labour or a legal professional.</p>

<h3>Where to Get Help</h3>
<p>If you have concerns about your employment rights, contact the Department of Labour and Industrial Relations, which has offices in Port Moresby, Lae, and other provincial centres. Trade unions can also provide guidance and representation. Legal aid organisations may assist workers who cannot afford private legal counsel.</p>

<p>Knowing your rights empowers you in the workplace. Stay informed and visit WantokJobs for more career resources.</p>`
  },
  {
    title: "Best Industries to Work in PNG Right Now",
    slug: "best-industries-work-png-right-now-2026",
    category: "industry-news",
    tags: "industries,jobs,png,growth,career",
    excerpt: "Explore the best industries to work in Papua New Guinea right now, from mining and LNG to agriculture, tech, and construction, with growth projections and job availability.",
    content: `<h2>Where the Jobs Are: PNG's Hottest Industries in 2026</h2>
<p>Papua New Guinea's economy is more diverse than many people realise. While the resources sector dominates headlines, several other industries are experiencing significant growth and creating new employment opportunities. Understanding which sectors are thriving can help you target your job search and make strategic career decisions.</p>

<h3>1. Oil, Gas, and LNG</h3>
<p>The PNG LNG project operated by ExxonMobil has transformed the country's energy sector since production began in 2014. With the proposed Papua LNG and P'nyang gas projects in development, the oil and gas industry continues to offer excellent career opportunities. Roles range from engineering and technical positions to logistics, administration, and community relations. The sector is known for offering premium salaries and comprehensive benefits packages, often including fly-in fly-out arrangements.</p>

<h3>2. Mining and Minerals</h3>
<p>Mining remains a cornerstone of PNG's economy. Gold, copper, silver, and nickel operations across the country employ thousands of workers directly and many more through contractors and service providers. The Wafi-Golpu gold-copper project and continued operations at Ok Tedi, Lihir, and Porgera ensure that mining will remain a major employer for decades to come.</p>

<h3>3. Agriculture and Agribusiness</h3>
<p>Agriculture is the livelihood of the vast majority of Papua New Guineans. The formal agribusiness sector — particularly coffee, cocoa, palm oil, and vanilla — is growing as global demand for these commodities increases. Modern agribusiness companies need professionals in farm management, quality control, export logistics, and marketing. This sector offers meaningful work that directly impacts rural communities.</p>

<h3>4. Construction and Infrastructure</h3>
<p>PNG is in the midst of a major infrastructure push. Road construction, building development, port upgrades, and airport improvements are creating thousands of jobs. The Connect PNG initiative aims to link all provincial capitals by road, generating enormous demand for construction workers, engineers, project managers, and support staff. Chinese, Australian, and PNG construction firms are all actively hiring.</p>

<h3>5. Banking and Financial Services</h3>
<p>PNG's banking sector has grown significantly, with BSP Financial Group now one of the largest banks in the Pacific. The expansion of mobile banking, microfinance, and insurance services means the financial sector needs more staff across all levels. Roles in compliance, risk management, and digital banking are particularly in demand.</p>

<h3>6. Telecommunications and Technology</h3>
<p>The digital economy in PNG is expanding rapidly. Mobile phone penetration exceeds 40% and is growing. Digicel and Telikom PNG are investing in network expansion, while new tech startups are emerging in Port Moresby. Opportunities exist in network engineering, software development, digital marketing, and IT support. This is one of the fastest-growing sectors for young professionals.</p>

<h3>7. Tourism and Hospitality</h3>
<p>Although still recovering from pandemic impacts, PNG's tourism sector holds immense potential. The country's unique cultural heritage, biodiversity, and adventure tourism offerings attract growing numbers of visitors. Hotels, tour operators, airlines, and hospitality training institutions all need skilled workers. Roles in hotel management, tour guiding, and event coordination are expanding.</p>

<h3>8. Healthcare and Pharmaceuticals</h3>
<p>The ongoing need to improve PNG's healthcare system creates consistent demand for medical professionals, healthcare administrators, and pharmaceutical representatives. International organisations including WHO and various NGOs also employ healthcare workers in PNG, often offering competitive international packages.</p>

<h3>Choosing Your Industry</h3>
<p>Consider your skills, qualifications, and interests when evaluating these industries. Think about long-term career growth potential, not just starting salary. Industries like tech and agribusiness may offer lower initial pay but faster growth trajectories for young professionals willing to learn and adapt.</p>

<p>Explore opportunities across all these industries on WantokJobs and find your next career move.</p>`
  },
  {
    title: "How to Transition from Informal to Formal Employment in PNG",
    slug: "transition-informal-to-formal-employment-png",
    category: "career-advice",
    tags: "informal,formal,employment,transition,png",
    excerpt: "Practical steps for Papua New Guineans to move from informal or self-employment into formal sector jobs, including skills recognition, training, and job search strategies.",
    content: `<h2>Moving from the Informal Sector to Formal Employment</h2>
<p>In Papua New Guinea, the informal economy is enormous. It's estimated that around 85% of the working population operates in the informal sector — market sellers, betel nut vendors, PMV drivers, subsistence farmers, and small-scale traders. While informal work provides vital income, formal employment offers benefits like regular pay, superannuation, medical coverage, and career progression. If you're looking to make the transition, here's how to get started.</p>

<h3>Recognise Your Existing Skills</h3>
<p>Working in the informal sector develops real, valuable skills that formal employers appreciate. Market sellers develop customer service, negotiation, and financial management skills. PMV operators understand logistics and time management. Farmers have knowledge of agriculture, weather patterns, and resource management. The key is learning to articulate these skills in terms that formal employers recognise.</p>

<p>Start by writing down everything you do in your current work. Include tasks like managing money, dealing with customers, solving problems, working in teams, and handling pressure. You may be surprised at how extensive your skill set actually is.</p>

<h3>Get Certified</h3>
<p>Formal employers typically require some form of certification or qualification. The good news is that PNG has several pathways to gain credentials without spending years in university:</p>

<p><strong>TVET Institutions:</strong> Technical and Vocational Education Training centres across PNG offer certificates in trades like carpentry, plumbing, electrical work, mechanics, and hospitality. These programs range from six months to two years and are specifically designed to prepare you for formal employment.</p>

<p><strong>Short Courses:</strong> Many organisations offer short certificate courses in areas like computer literacy, bookkeeping, first aid, and workplace safety. These can be completed in days or weeks and immediately make your CV more competitive.</p>

<p><strong>Recognition of Prior Learning (RPL):</strong> Some institutions allow experienced workers to have their existing skills formally assessed and certified. This means you may not need to start from scratch — your years of practical experience count for something.</p>

<h3>Build Your Documentation</h3>
<p>Formal employment requires paperwork that informal workers may not have. Ensure you have: a current national ID card, a Tax Identification Number (TIN) from the Internal Revenue Commission, a bank account for salary payments, a written CV documenting your work history and skills, and copies of any certificates or references.</p>

<p>If you've never had a formal employer to provide a reference, ask community leaders, church leaders, or customers who can vouch for your character and work ethic. Personal references carry weight in PNG's relationship-driven culture.</p>

<h3>Start with Entry-Level Formal Roles</h3>
<p>Don't expect to jump straight into a senior position. Target entry-level roles that match your existing skills. Security guard positions, warehouse assistants, retail assistants, farm hands at commercial plantations, and construction labourers are common entry points into formal employment. These roles provide the foundation you need — regular hours, workplace experience, and a formal employment record.</p>

<h3>Consider Seasonal or Contract Work</h3>
<p>Seasonal work programs, particularly Australia's Pacific Australia Labour Mobility (PALM) scheme, offer PNG workers the chance to earn formal wages, gain international work experience, and develop skills. Upon return, this experience is highly valued by PNG employers.</p>

<h3>Network and Seek Support</h3>
<p>Tell people you're looking for formal work. In PNG, many jobs are filled through word of mouth. Attend community meetings, church gatherings, and local events where employers or connected individuals might be present. Register with employment agencies and job platforms like WantokJobs to access listings you might not find through personal networks alone.</p>

<h3>Be Patient and Persistent</h3>
<p>The transition from informal to formal employment doesn't happen overnight. It requires investment in skills, documentation, and job searching. But the rewards — financial security, career growth, and improved quality of life for you and your family — make the effort worthwhile.</p>

<p>Take the first step today. Create your profile on WantokJobs and start exploring formal employment opportunities across Papua New Guinea.</p>`
  },
  {
    title: "Remote Work Opportunities for Papua New Guineans",
    slug: "remote-work-opportunities-papua-new-guineans",
    category: "career-advice",
    tags: "remote-work,digital,online,jobs,png",
    excerpt: "Discover remote work opportunities available to Papua New Guineans, from freelancing and virtual assistance to tech roles, plus tips on overcoming connectivity challenges.",
    content: `<h2>The Digital Economy Opens New Doors for PNG Workers</h2>
<p>Remote work has transformed employment globally, and Papua New Guineans are increasingly able to participate in this revolution. While challenges like internet connectivity remain, the opportunities for skilled PNG workers to earn income online are growing. Whether you're in Port Moresby with reliable internet or in a provincial town with mobile data, there are remote work options worth exploring.</p>

<h3>Types of Remote Work Available</h3>
<p><strong>Virtual Assistance:</strong> Many international businesses hire virtual assistants to handle email management, scheduling, data entry, and customer service. If you're organised, detail-oriented, and have good English skills, this is an accessible entry point. Platforms like Upwork, Fiverr, and OnlineJobs.ph connect virtual assistants with employers worldwide. Pay ranges from USD 3-15 per hour depending on skills and experience.</p>

<p><strong>Freelance Writing and Content Creation:</strong> If you can write well in English, freelance writing offers real income potential. Businesses around the world need blog posts, website content, product descriptions, and social media copy. PNG writers have a unique advantage when writing about Pacific Island topics, development, and regional issues. Content mills pay modestly, but skilled writers can earn USD 10-50 per article on higher-end platforms.</p>

<p><strong>Graphic Design and Digital Art:</strong> Designers who are proficient in tools like Adobe Photoshop, Illustrator, or Canva can offer their services to global clients. Logo design, social media graphics, and marketing materials are consistently in demand. A strong portfolio is more important than formal qualifications in this field.</p>

<p><strong>Web and Software Development:</strong> This is where the highest-paying remote work is found. If you have skills in HTML, CSS, JavaScript, Python, or other programming languages, you can access a global job market. PNG developers can earn significantly more working remotely for international companies than in equivalent local roles. Salaries for experienced remote developers range from USD 20,000 to USD 80,000 or more annually.</p>

<p><strong>Online Tutoring and Teaching:</strong> English tutoring platforms hire native and proficient English speakers to teach students in Asia and other regions. If you have a teaching background or strong English skills, platforms like Cambly and iTalki offer flexible hours and reasonable pay.</p>

<h3>Overcoming Connectivity Challenges</h3>
<p>Let's be honest — internet connectivity in PNG can be unreliable and expensive. Here are strategies to manage this:</p>

<p><strong>Choose work that's asynchronous:</strong> Focus on jobs that don't require real-time video calls. Writing, design, data entry, and development can often be done offline and uploaded when you have connectivity.</p>

<p><strong>Use mobile data strategically:</strong> Digicel and Telikom offer data packages that can support basic remote work. Work offline where possible and sync during off-peak hours when speeds are better.</p>

<p><strong>Co-working spaces:</strong> Port Moresby now has several co-working spaces and cafes with reliable WiFi. These provide a professional environment and the connectivity you need for remote work.</p>

<p><strong>Starlink and satellite internet:</strong> Satellite internet services are becoming available in PNG and could be game-changers for remote workers in provincial areas. While currently expensive, costs are expected to decrease as adoption grows.</p>

<h3>Getting Started</h3>
<p><strong>Build your skills:</strong> Free online learning platforms like Coursera, Khan Academy, and freeCodeCamp offer courses in everything from digital marketing to programming. Invest time in building marketable skills before seeking clients.</p>

<p><strong>Create a professional profile:</strong> Set up profiles on freelancing platforms with a clear description of your skills, a professional photo, and examples of your work. Start with competitive pricing to build your reputation and gather reviews.</p>

<p><strong>Start small:</strong> Take on a few small projects to build your portfolio and reputation. As you gain positive reviews and experience, you can increase your rates and take on bigger projects.</p>

<h3>Tax and Legal Considerations</h3>
<p>Income earned from remote work is taxable in PNG. Register for a TIN with the Internal Revenue Commission and keep records of your earnings. If you're earning in foreign currency, you'll need a bank account that can receive international transfers — BSP and Kina Bank offer such services.</p>

<p>Remote work offers Papua New Guineans unprecedented access to the global economy. Start building your digital skills and explore remote opportunities alongside local job listings on WantokJobs.</p>`
  },
  {
    title: "Starting Your Career in PNG: A Guide for Fresh Graduates",
    slug: "starting-career-png-guide-fresh-graduates",
    category: "career-advice",
    tags: "graduates,career,first-job,png,advice",
    excerpt: "Essential career advice for fresh graduates in Papua New Guinea, covering job search strategies, networking, professional development, and managing expectations.",
    content: `<h2>Welcome to the Working World — Here's How to Navigate It</h2>
<p>Congratulations on graduating! Whether you've just received your degree from UPNG, Unitech, Divine Word University, or another institution, you're about to enter one of the most exciting and challenging phases of your life. The transition from student to professional can be daunting, but with the right approach, you can build a rewarding career in Papua New Guinea.</p>

<h3>Set Realistic Expectations</h3>
<p>Here's the truth: your first job probably won't be your dream job, and that's completely normal. Many graduates expect to land a senior role immediately, but employers value experience alongside qualifications. Be willing to start in an entry-level position and prove yourself. The skills, connections, and reputation you build in your first few years will shape the rest of your career.</p>

<p>Entry-level salaries in PNG typically range from K20,000 to K40,000 depending on the industry and your qualifications. While this may seem modest, remember that your earning potential will grow significantly with experience and professional development.</p>

<h3>Start Your Job Search Early</h3>
<p>Don't wait until after graduation to begin looking for work. Start during your final year by attending career fairs at your university, registering on job platforms like WantokJobs, and reaching out to companies you're interested in. Many organisations recruit graduates months before they finish their studies.</p>

<p>Apply broadly but strategically. Don't limit yourself to only one type of role or one company. Cast a wide net, but tailor each application to the specific position. A generic application that looks like it was sent to fifty companies will be ignored.</p>

<h3>Build Your Network</h3>
<p>In PNG, relationships matter enormously in the professional world. Start building your network while you're still studying. Connect with alumni from your university who are working in your field of interest. Attend industry events and seminars. Join professional associations relevant to your field. Follow and engage with PNG business leaders on LinkedIn.</p>

<p>Don't be afraid to reach out to people for advice and mentorship. Most professionals remember what it was like to be a fresh graduate and are willing to help. A simple, respectful message asking for career guidance can open unexpected doors.</p>

<h3>Consider Graduate Programs</h3>
<p>Several major employers in PNG offer structured graduate programs. Companies like BSP Financial Group, Oil Search (now Santos), Digicel, and the big four accounting firms regularly recruit graduates for rotational programs that provide training, mentoring, and exposure to different parts of the business. These programs are highly competitive but offer an excellent career launchpad.</p>

<p>Government departments also recruit graduates, though the process can be slower. The PNG public service offers stability and the opportunity to contribute directly to national development.</p>

<h3>Develop Professional Skills</h3>
<p>Your degree gives you technical knowledge, but employers also want soft skills. Focus on developing these key areas:</p>

<p><strong>Communication:</strong> Practice writing professional emails, reports, and presentations. Strong written and verbal communication in English is essential for most professional roles in PNG.</p>

<p><strong>Computer literacy:</strong> Ensure you're proficient in Microsoft Office (Word, Excel, PowerPoint) at minimum. Depending on your field, learn industry-specific software. Many graduates are surprised by how much of professional work revolves around spreadsheets and email.</p>

<p><strong>Time management:</strong> The university environment is relatively flexible. The workplace is not. Develop habits of punctuality, meeting deadlines, and managing multiple priorities simultaneously.</p>

<p><strong>Teamwork:</strong> Nearly every job requires working with others. Learn to collaborate, handle disagreements professionally, and contribute positively to team dynamics.</p>

<h3>Gain Experience While You Search</h3>
<p>If you don't land a job immediately after graduation, don't sit idle. Volunteer with NGOs or community organisations. Take on freelance or casual work. Intern even if unpaid — the experience and references are worth it. Employers are wary of gaps in your CV, so stay active and productive.</p>

<h3>Take Care of Yourself</h3>
<p>Job searching can be stressful and discouraging, especially in a competitive market. Rejections are normal — even the most successful professionals faced them early in their careers. Stay persistent, keep improving your skills and applications, and lean on your support network of family, friends, and mentors.</p>

<h3>Think Long-Term</h3>
<p>Your career is a marathon, not a sprint. The decisions you make in your first few years — the skills you develop, the reputation you build, the relationships you nurture — compound over time. Stay curious, stay humble, and keep learning.</p>

<p>Your journey starts now. Create your profile on WantokJobs and begin exploring opportunities across Papua New Guinea. Em nau tasol — go for it!</p>`
  }
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO articles (author_id, title, slug, content, excerpt, category, tags, status, ai_generated, published_at)
  VALUES (1, ?, ?, ?, ?, ?, ?, 'published', 1, datetime('now'))
`);

const insertMany = db.transaction((articles) => {
  for (const a of articles) {
    insert.run(a.title, a.slug, a.content, a.excerpt, a.category, a.tags);
  }
});

insertMany(articles);
console.log(`Inserted ${articles.length} articles successfully.`);
console.log('Total articles:', db.prepare('SELECT COUNT(*) as c FROM articles').get().c);
