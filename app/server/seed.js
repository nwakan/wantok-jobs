require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = db.prepare(`
      INSERT OR IGNORE INTO users (email, password_hash, role, name)
      VALUES (?, ?, ?, ?)
    `).run('admin@wantokjobs.com', adminPassword, 'admin', 'Admin User');

    if (adminResult.changes > 0) {
      console.log('✅ Admin user created: admin@wantokjobs.com / admin123');
      console.log('⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
    }

    // Create sample employers
    const employer1Password = await bcrypt.hash('employer123', 10);
    const employer1 = db.prepare(`
      INSERT OR IGNORE INTO users (email, password_hash, role, name)
      VALUES (?, ?, ?, ?)
    `).run('employer1@example.com', employer1Password, 'employer', 'John Smith');

    if (employer1.changes > 0) {
      db.prepare(`
        INSERT INTO profiles_employer (user_id, company_name, industry, company_size, location, country, description, verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        employer1.lastInsertRowid,
        'Port Moresby Bank',
        'Banking & Finance',
        '500-1000',
        'Port Moresby',
        'Papua New Guinea',
        'Leading financial institution in PNG providing banking services nationwide.',
        1
      );
      console.log('✅ Sample employer 1 created');
    }

    const employer2Password = await bcrypt.hash('employer123', 10);
    const employer2 = db.prepare(`
      INSERT OR IGNORE INTO users (email, password_hash, role, name)
      VALUES (?, ?, ?, ?)
    `).run('employer2@example.com', employer2Password, 'employer', 'Sarah Johnson');

    if (employer2.changes > 0) {
      db.prepare(`
        INSERT INTO profiles_employer (user_id, company_name, industry, company_size, location, country, description, verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        employer2.lastInsertRowid,
        'Pacific Tech Solutions',
        'Technology',
        '50-200',
        'Suva',
        'Fiji',
        'Technology consulting and software development company serving the Pacific region.',
        1
      );
      console.log('✅ Sample employer 2 created');
    }

    // Create sample jobseekers
    for (let i = 1; i <= 3; i++) {
      const password = await bcrypt.hash('jobseeker123', 10);
      const result = db.prepare(`
        INSERT OR IGNORE INTO users (email, password_hash, role, name)
        VALUES (?, ?, ?, ?)
      `).run(`jobseeker${i}@example.com`, password, 'jobseeker', `Job Seeker ${i}`);

      if (result.changes > 0) {
        db.prepare(`
          INSERT INTO profiles_jobseeker (
            user_id, phone, location, country, bio, skills, 
            desired_job_type, availability, profile_complete
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          result.lastInsertRowid,
          `+675 ${7000 + i}1234`,
          'Port Moresby',
          'Papua New Guinea',
          'Experienced professional seeking new opportunities',
          JSON.stringify(['Communication', 'Teamwork', 'Problem Solving']),
          'full-time',
          'Immediate',
          1
        );
      }
    }
    console.log('✅ Sample jobseekers created');

    // Create real jobs from PNG Workforce
    const employer1Id = db.prepare("SELECT id FROM users WHERE email = 'employer1@example.com'").get()?.id;
    const employer2Id = db.prepare("SELECT id FROM users WHERE email = 'employer2@example.com'").get()?.id;

    if (employer1Id && employer2Id) {
      const jobs = [
        {
          employer_id: employer1Id,
          title: 'Senior Banking Officer',
          description: 'We are seeking an experienced Senior Banking Officer to join our team in Port Moresby. The role involves managing client relationships, processing loans, and ensuring compliance with banking regulations.',
          requirements: JSON.stringify([
            'Degree in Finance, Accounting or related field',
            'Minimum 5 years banking experience',
            'Strong knowledge of PNG banking regulations',
            'Excellent customer service skills',
            'Proficiency in banking software'
          ]),
          location: 'Port Moresby',
          country: 'Papua New Guinea',
          job_type: 'full-time',
          experience_level: 'Senior',
          industry: 'Banking & Finance',
          salary_min: 80000,
          salary_max: 120000,
          salary_currency: 'PGK',
          status: 'active'
        },
        {
          employer_id: employer1Id,
          title: 'Customer Service Representative',
          description: 'Join our customer service team to provide excellent banking services to our clients. This role involves handling customer inquiries, processing transactions, and promoting banking products.',
          requirements: JSON.stringify([
            'Grade 12 or equivalent',
            'Previous customer service experience preferred',
            'Good communication skills in English and Tok Pisin',
            'Computer literacy',
            'Professional appearance and attitude'
          ]),
          location: 'Lae',
          country: 'Papua New Guinea',
          job_type: 'full-time',
          experience_level: 'Entry Level',
          industry: 'Banking & Finance',
          salary_min: 35000,
          salary_max: 45000,
          salary_currency: 'PGK',
          status: 'active'
        },
        {
          employer_id: employer2Id,
          title: 'Software Developer',
          description: 'Pacific Tech Solutions is looking for a talented Software Developer to join our growing team. You will work on exciting projects for clients across the Pacific region, building web and mobile applications.',
          requirements: JSON.stringify([
            'Degree in Computer Science or related field',
            'Proficiency in JavaScript, React, Node.js',
            'Experience with databases (SQL/NoSQL)',
            'Strong problem-solving skills',
            'Ability to work in a team environment'
          ]),
          location: 'Suva',
          country: 'Fiji',
          job_type: 'full-time',
          experience_level: 'Mid Level',
          industry: 'Technology',
          salary_min: 45000,
          salary_max: 65000,
          salary_currency: 'FJD',
          status: 'active'
        },
        {
          employer_id: employer2Id,
          title: 'IT Support Technician',
          description: 'We need an IT Support Technician to provide technical support to our clients. This role involves troubleshooting hardware and software issues, maintaining networks, and ensuring system security.',
          requirements: JSON.stringify([
            'Diploma or Certificate in IT',
            'Experience with Windows and Mac systems',
            'Knowledge of networking basics',
            'Good customer service skills',
            'Ability to explain technical concepts simply'
          ]),
          location: 'Port Vila',
          country: 'Vanuatu',
          job_type: 'full-time',
          experience_level: 'Entry Level',
          industry: 'Technology',
          salary_min: 2500000,
          salary_max: 3500000,
          salary_currency: 'VUV',
          status: 'active'
        },
        {
          employer_id: employer1Id,
          title: 'Accountant',
          description: 'Port Moresby Bank is seeking a qualified Accountant to manage financial records, prepare reports, and ensure compliance with accounting standards. This is an excellent opportunity for a detail-oriented professional.',
          requirements: JSON.stringify([
            'CPA qualification or equivalent',
            'Minimum 3 years accounting experience',
            'Proficiency in accounting software',
            'Strong analytical skills',
            'Knowledge of PNG tax regulations'
          ]),
          location: 'Port Moresby',
          country: 'Papua New Guinea',
          job_type: 'full-time',
          experience_level: 'Mid Level',
          industry: 'Banking & Finance',
          salary_min: 60000,
          salary_max: 85000,
          salary_currency: 'PGK',
          status: 'active'
        }
      ];

      for (const job of jobs) {
        db.prepare(`
          INSERT INTO jobs (
            employer_id, title, description, requirements, location, country,
            job_type, experience_level, industry, salary_min, salary_max,
            salary_currency, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          job.employer_id,
          job.title,
          job.description,
          job.requirements,
          job.location,
          job.country,
          job.job_type,
          job.experience_level,
          job.industry,
          job.salary_min,
          job.salary_max,
          job.salary_currency,
          job.status
        );
      }
      console.log('✅ Sample jobs created');
    }

    console.log('✅ Seeding complete!');
    console.log('\n📝 Test Accounts:');
    console.log('Admin: admin@wantokjobs.com / admin123');
    console.log('Employer: employer1@example.com / employer123');
    console.log('Jobseeker: jobseeker1@example.com / jobseeker123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }

  process.exit(0);
}

seed();
