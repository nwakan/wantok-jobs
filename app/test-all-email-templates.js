/**
 * Comprehensive Email Template Testing Script
 * Sends all 26+ email templates to nick.wakan@gmail.com for review
 * with 20-second delays between each.
 */

// Load environment variables from .env file
require('dotenv').config({ path: '.env' });

const email = require('./server/lib/email');
const jobAlertEmails = require('./server/lib/job-alert-emails');

const TEST_EMAIL = 'nick.wakan@gmail.com';

// Verify BREVO_API_KEY is loaded
if (!process.env.BREVO_API_KEY) {
  console.error('\n❌ ERROR: BREVO_API_KEY not found in environment variables!');
  console.error('Make sure .env file exists and contains BREVO_API_KEY\n');
  process.exit(1);
}

console.log('\n✅ BREVO_API_KEY loaded successfully');
console.log('✅ EMAIL_MODE:', process.env.EMAIL_MODE || 'test');
console.log('');

const DELAY_MS = 20000; // 20 seconds

// Test data
const testUser = {
  id: 1,
  name: 'Nick Wakan',
  email: TEST_EMAIL,
  role: 'jobseeker',
  account_type: 'jobseeker'
};

const testEmployer = {
  id: 2,
  name: 'Test Employer',
  email: TEST_EMAIL,
  role: 'employer',
  account_type: 'employer'
};

const testJob = {
  id: 123,
  title: 'Senior Software Developer',
  company_name: 'Air Niugini',
  location: 'Port Moresby, NCD',
  job_type: 'Full-time',
  salary_min: 80000,
  salary_max: 120000,
  description: 'Join our team as a Senior Software Developer working on mission-critical aviation systems.'
};

const testJobs = [
  testJob,
  {
    id: 124,
    title: 'Marketing Manager',
    company_name: 'BSP',
    location: 'Port Moresby, NCD',
    job_type: 'Full-time',
    salary_min: 60000,
    salary_max: 90000,
    description: 'Lead marketing initiatives for PNG\'s largest bank.'
  }
];

const testAlert = {
  id: 1,
  keywords: 'software developer',
  location: 'Port Moresby',
  job_type: 'Full-time'
};

const testOrder = {
  id: 456,
  total: 299,
  plan_name: 'Premium',
  status: 'completed',
  created_at: new Date().toISOString()
};

const testPlan = {
  name: 'Premium',
  price: 299,
  features: ['Unlimited job posts', 'Featured listings', 'Advanced analytics']
};

const testPayment = {
  id: 789,
  reference_code: 'PAY-2026-001',
  amount: 299,
  status: 'verified',
  created_at: new Date().toISOString()
};

const testInterview = {
  scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  duration_minutes: 60,
  type: "in-person",
  location: 'Air Niugini HQ',
  interviewer_name: 'John Smith',
  interviewer_title: 'HR Manager',
  interview_type: 'In-person',
  notes: 'Please bring your portfolio'
};

const testContact = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'Question about job posting',
  message: 'I have a question about how to post jobs.'
};

const testStats = {
  newJobs: 45,
  newUsers: 156,
  newApplications: 234,
  revenue: 5980,
  activeEmployers: 150,      // Number of employers currently hiring
  totalJobseekers: 33481     // Total registered jobseekers
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAllTemplates() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 EMAIL TEMPLATE TESTING STARTED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`Sending to: ${TEST_EMAIL}`);
  console.log(`Delay between emails: ${DELAY_MS / 1000} seconds`);
  console.log('');

  const templates = [
    { name: '01. Welcome - Jobseeker', fn: () => email.sendWelcomeJobseeker(testUser) },
    { name: '02. Welcome - Employer', fn: () => email.sendWelcomeEmployer(testEmployer) },
    { name: '03. Email Verification', fn: () => email.sendVerificationEmail(testUser, 'test-token-123') },
    { name: '04. Password Reset', fn: () => email.sendPasswordResetEmail(testUser, 'reset-token-456') },
    { name: '05. Password Changed', fn: () => email.sendPasswordChangedEmail(testUser) },
    { name: '06. Application Confirmation', fn: () => email.sendApplicationConfirmationEmail(testUser, testJob, testJob.company_name) },
    { name: '07. Application Status - Shortlisted', fn: () => email.sendApplicationStatusEmail(testUser, testJob.title, 'shortlisted', testJob.company_name) },
    { name: '08. Application Status - Rejected', fn: () => email.sendApplicationStatusEmail(testUser, testJob.title, 'rejected', testJob.company_name) },
    { name: '09. New Application (Employer)', fn: () => email.sendNewApplicationEmail(testEmployer, testJob.title, testUser.name, 5) },
    { name: '10. Job Posted Confirmation', fn: () => email.sendJobPostedEmail(testEmployer, testJob) },
    { name: '11. Job Expiring Soon', fn: () => email.sendJobExpiringSoonEmail(testEmployer, testJob, 3) },
    { name: '12. Job Alert - General', fn: () => email.sendJobAlertEmail(testUser, testJobs, testAlert.keywords) },
    { name: '13. Profile Completion Nudge', fn: () => email.sendProfileNudgeEmail(testUser, 45) },
    { name: '14. Order Confirmation', fn: () => email.sendOrderConfirmationEmail(testEmployer, testOrder, testPlan) },
    { name: '15. Contact Form - Admin', fn: () => email.sendContactFormAdminEmail(testContact) },
    { name: '16. Contact Form - Auto Reply', fn: () => email.sendContactFormAutoReply(testContact) },
    { name: '17. Admin Daily Digest', fn: () => email.sendAdminDigestEmail(TEST_EMAIL, testStats) },
    { name: '18. Welcome Newsletter', fn: () => email.sendWelcomeNewsletter(TEST_EMAIL, 'Nick') },
    { name: '19. Newsletter Digest', fn: () => email.sendNewsletterDigest({ email: TEST_EMAIL, name: 'Nick' }, testJobs, testStats, []) },
    { name: '20. Interview Invitation', fn: () => email.sendInterviewInviteEmail(testUser, testJob, testJob.company_name, testInterview) },
    { name: '21. Payment Verified', fn: () => email.sendPaymentVerifiedEmail(testEmployer, testPayment, 10, 25) },
    { name: '22. Payment Rejected', fn: () => email.sendPaymentRejectedEmail(testEmployer, testPayment, 'Amount does not match') },
    { 
      name: '23. Job Alert - Instant', 
      fn: async () => {
        const html = jobAlertEmails.instantJobAlert({ userName: testUser.name, alert: testAlert, job: testJob });
        return email.sendEmail({ to: TEST_EMAIL, toName: testUser.name, subject: '[TEST] Instant Job Alert', html });
      }
    },
    { 
      name: '24. Job Alert - Daily Digest', 
      fn: async () => {
        const html = jobAlertEmails.dailyJobAlertDigest({ userName: testUser.name, alert: testAlert, jobs: testJobs, totalMatches: 2 });
        return email.sendEmail({ to: TEST_EMAIL, toName: testUser.name, subject: '[TEST] Daily Job Alert Digest', html });
      }
    },
    { 
      name: '25. Job Alert - Weekly Digest', 
      fn: async () => {
        const html = jobAlertEmails.weeklyJobAlertDigest({ userName: testUser.name, alert: testAlert, jobs: testJobs, totalMatches: 2 });
        return email.sendEmail({ to: TEST_EMAIL, toName: testUser.name, subject: '[TEST] Weekly Job Alert Digest', html });
      }
    },
    { 
      name: '26. Job Alert - No Matches', 
      fn: async () => {
        const html = jobAlertEmails.noMatchesAlert({ userName: testUser.name, alert: testAlert });
        return email.sendEmail({ to: TEST_EMAIL, toName: testUser.name, subject: '[TEST] No Matches Alert', html });
      }
    },
  ];

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    const progress = `[${i + 1}/${templates.length}]`;
    
    try {
      console.log(`${progress} Sending: ${template.name}`);
      await template.fn();
      successCount++;
      console.log(`${progress} ✅ Success: ${template.name}`);
    } catch (error) {
      failureCount++;
      console.log(`${progress} ❌ Failed: ${template.name}`);
      console.log(`    Error: ${error.message}`);
    }

    // Wait 20 seconds before next email (except after last one)
    if (i < templates.length - 1) {
      console.log(`    ⏳ Waiting ${DELAY_MS / 1000} seconds...`);
      console.log('');
      await wait(DELAY_MS);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TESTING COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`Total templates tested: ${templates.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log('');
  console.log(`📧 All emails sent to: ${TEST_EMAIL}`);
  console.log('');
  console.log('Please check your inbox (and spam folder) to review.');
  console.log('');
}

testAllTemplates()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
