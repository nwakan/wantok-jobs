const db = require('../server/database');

const testimonials = [
  {
    name: 'Maria Kau',
    role: 'Jobseeker',
    company: 'Bank of South Pacific',
    quote: 'WantokJobs helped me find my dream role as a Finance Officer at BSP. Within two weeks of signing up, I had three interview invitations. The job alerts feature made sure I never missed a new posting in my field.',
    rating: 5,
    featured: 1,
    status: 'approved'
  },
  {
    name: 'James Mondo',
    role: 'Employer',
    company: 'Lae Manufacturing Ltd',
    quote: 'As an employer in Lae, finding skilled tradespeople was always a challenge. WantokJobs connected us with qualified candidates from across PNG. We filled four technician positions in just one month.',
    rating: 5,
    featured: 1,
    status: 'approved'
  },
  {
    name: 'Grace Talia',
    role: 'Jobseeker',
    company: 'Digicel PNG',
    quote: 'After graduating from UPNG, I struggled to find work for months. A friend told me about WantokJobs and I landed a Customer Service role at Digicel within three weeks. The platform is easy to use even on mobile.',
    rating: 5,
    featured: 1,
    status: 'approved'
  },
  {
    name: 'Peter Waim',
    role: 'Employer',
    company: 'Ok Tedi Mining',
    quote: 'WantokJobs has become our go-to recruitment platform. The screening questions feature saves us hours of reviewing unqualified applications. We have hired over 20 staff through the platform this year.',
    rating: 4,
    featured: 1,
    status: 'approved'
  },
  {
    name: 'Ruth Siaguru',
    role: 'Jobseeker',
    company: 'World Vision PNG',
    quote: 'I was working in retail but wanted to move into community development. WantokJobs showed me opportunities I never knew existed. Now I work with World Vision supporting rural communities in the Highlands.',
    rating: 5,
    featured: 0,
    status: 'approved'
  },
  {
    name: 'Thomas Ila',
    role: 'Employer',
    company: 'Ela Motors',
    quote: 'The quality of candidates on WantokJobs is impressive. We posted a Sales Manager role and received 45 applications in the first week. The platform makes it easy to shortlist and communicate with applicants.',
    rating: 4,
    featured: 0,
    status: 'approved'
  }
];

const insert = db.prepare(`
  INSERT INTO testimonials (name, role, company, quote, rating, featured, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const existing = db.prepare('SELECT COUNT(*) as count FROM testimonials').get();
if (existing.count > 0) {
  console.log(`⚠️  Testimonials table already has ${existing.count} rows. Skipping seed.`);
  process.exit(0);
}

const tx = db.transaction(() => {
  for (const t of testimonials) {
    insert.run(t.name, t.role, t.company, t.quote, t.rating, t.featured, t.status);
  }
});
tx();
console.log(`✅ Seeded ${testimonials.length} testimonials`);
