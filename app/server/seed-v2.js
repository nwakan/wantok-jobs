const db = require('./database');

function seedPlans() {
  const plans = [
    { name: 'Free', price: 0, duration_days: 0, job_limit: 1, featured_jobs: 0, resume_views: 10, ai_screening: 0, priority_support: 0 },
    { name: 'Starter', price: 2500, duration_days: 30, job_limit: 5, featured_jobs: 1, resume_views: 50, ai_screening: 0, priority_support: 0 },
    { name: 'Professional', price: 7500, duration_days: 30, job_limit: 20, featured_jobs: 5, resume_views: 200, ai_screening: 1, priority_support: 0 },
    { name: 'Enterprise', price: 20000, duration_days: 30, job_limit: 999, featured_jobs: 20, resume_views: 999999, ai_screening: 1, priority_support: 1 },
    { name: 'Pay-per-post', price: 500, duration_days: 60, job_limit: 1, featured_jobs: 0, resume_views: 25, ai_screening: 0, priority_support: 0 }
  ];

  const existing = db.prepare('SELECT COUNT(*) as count FROM plans').get();
  if (existing.count === 0) {
    const insert = db.prepare('INSERT INTO plans (name, price, currency, duration_days, job_limit, featured_jobs, resume_views, ai_screening, priority_support) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    plans.forEach(p => insert.run(p.name, p.price, 'PGK', p.duration_days, p.job_limit, p.featured_jobs, p.resume_views, p.ai_screening, p.priority_support));
    console.log('✅ Seeded 5 plans');
  }
}

function seedCategories() {
  const categories = [
    'Accounting', 'Administration', 'Banking & Finance', 'Community & Development',
    'Construction & Trades', 'Education & Training', 'Engineering', 'Government',
    'Health & Medical', 'Hospitality & Tourism', 'HR & Recruitment', 'ICT & Technology',
    'Legal & Law', 'Management & Executive', 'Manufacturing & Logistics', 'Marketing & Sales',
    'Mining & Resources', 'NGO & Volunteering', 'Science & Research', 'Security'
  ];

  const existing = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (existing.count === 0) {
    const insert = db.prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)');
    categories.forEach((cat, idx) => {
      const slug = cat.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
      insert.run(cat, slug, idx);
    });
    console.log('✅ Seeded 20 categories');
  }
}

function seedEmailTemplates() {
  const templates = [
    {
      name: 'welcome_jobseeker',
      subject: 'Welcome to WantokJobs!',
      body_html: '<h1>Welcome {{name}}!</h1><p>Your jobseeker account is ready.</p>',
      body_text: 'Welcome {{name}}! Your jobseeker account is ready.',
      variables: 'name,email'
    },
    {
      name: 'welcome_employer',
      subject: 'Welcome to WantokJobs - Start Hiring Today',
      body_html: '<h1>Welcome {{company_name}}!</h1><p>Your employer account is ready. Start posting jobs now.</p>',
      body_text: 'Welcome {{company_name}}! Your employer account is ready.',
      variables: 'company_name,name,email'
    },
    {
      name: 'application_received',
      subject: 'Application Received for {{job_title}}',
      body_html: '<p>Hi {{name}},</p><p>We received your application for <strong>{{job_title}}</strong>.</p>',
      body_text: 'Hi {{name}}, We received your application for {{job_title}}.',
      variables: 'name,job_title,company_name'
    },
    {
      name: 'application_status_changed',
      subject: 'Application Status Update: {{job_title}}',
      body_html: '<p>Hi {{name}},</p><p>Your application for <strong>{{job_title}}</strong> status changed to: {{status}}</p>',
      body_text: 'Hi {{name}}, Your application for {{job_title}} status: {{status}}',
      variables: 'name,job_title,status,company_name'
    },
    {
      name: 'password_reset',
      subject: 'Reset Your Password - WantokJobs',
      body_html: '<p>Hi {{name}},</p><p>Click here to reset: {{reset_link}}</p>',
      body_text: 'Hi {{name}}, Reset your password: {{reset_link}}',
      variables: 'name,reset_link'
    },
    {
      name: 'job_alert',
      subject: 'New Jobs Matching Your Preferences',
      body_html: '<h2>New Jobs for You</h2><p>{{job_count}} new jobs match your alert.</p>',
      body_text: '{{job_count}} new jobs match your alert.',
      variables: 'name,job_count,jobs_list'
    }
  ];

  const existing = db.prepare('SELECT COUNT(*) as count FROM email_templates').get();
  if (existing.count === 0) {
    const insert = db.prepare('INSERT INTO email_templates (name, subject, body_html, body_text, variables) VALUES (?, ?, ?, ?, ?)');
    templates.forEach(t => insert.run(t.name, t.subject, t.body_html, t.body_text, t.variables));
    console.log('✅ Seeded 6 email templates');
  }
}

function runSeedV2() {
  console.log('🌱 Running v2 seed...');
  seedPlans();
  seedCategories();
  seedEmailTemplates();
  console.log('✅ v2 seed complete!');
}

// Run if called directly
if (require.main === module) {
  runSeedV2();
}

module.exports = { runSeedV2 };
