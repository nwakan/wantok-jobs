import { FileText, Mail } from 'lucide-react';
import PageHead from '../components/PageHead';

export default function Terms() {
  return (
    <>
      <PageHead
        title="Terms of Service"
        description="WantokJobs Terms of Service - Legal agreement for using our job platform."
      />
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <FileText className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600">
              Last updated: February 16, 2026
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm p-8 prose prose-primary max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 mb-4">
                Welcome to WantokJobs! These Terms of Service ("Terms") govern your use of the WantokJobs platform, website, and services (collectively, the "Service"). By accessing or using our Service, you agree to be bound by these Terms.
              </p>
              <p className="text-gray-600">
                If you do not agree to these Terms, you may not access or use the Service. We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Account Terms</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Account Creation</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>You must be at least 18 years old to create an account</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for maintaining the security of your account and password</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You may not use another person's account without permission</li>
                <li>You may not create multiple accounts to abuse the Service</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Account Types</h3>
              <p className="text-gray-600 mb-3">WantokJobs offers two types of accounts:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Job Seeker Accounts:</strong> Free accounts for individuals seeking employment</li>
                <li><strong>Employer Accounts:</strong> Accounts for companies and organizations posting jobs (subject to verification and applicable fees)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Job Seeker Terms</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Profile Information</h3>
              <p className="text-gray-600 mb-4">
                You agree to provide truthful, accurate, and complete information in your profile, resume, and job applications. Misrepresentation of qualifications, experience, or credentials may result in account suspension.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Job Applications</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>You may apply to jobs freely through the platform</li>
                <li>Your application information will be shared with the employer</li>
                <li>You are responsible for all communications with employers</li>
                <li>WantokJobs is not responsible for employer decisions or hiring outcomes</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Job Alerts</h3>
              <p className="text-gray-600">
                You may opt-in to receive job alerts via email, SMS, or WhatsApp. Standard messaging rates may apply. You can unsubscribe at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Employer Terms</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Company Verification</h3>
              <p className="text-gray-600 mb-4">
                All employer accounts must undergo verification. We reserve the right to reject or suspend accounts that do not meet our standards or engage in fraudulent activity.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Job Postings</h3>
              <p className="text-gray-600 mb-3">When posting jobs, you agree to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Provide accurate and complete job descriptions</li>
                <li>Comply with all applicable employment laws in Papua New Guinea</li>
                <li>Not discriminate based on race, gender, religion, age, disability, or other protected characteristics</li>
                <li>Post only legitimate job opportunities (no scams, pyramid schemes, or misleading offers)</li>
                <li>Not use the platform to collect personal information for purposes other than recruitment</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Pricing and Payments</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Employer services are subject to the pricing plans published on our website</li>
                <li>All fees are in Papua New Guinea Kina (PGK) and are non-refundable unless otherwise stated</li>
                <li>Payment is due at the time of service purchase</li>
                <li>We reserve the right to change pricing with 30 days notice</li>
                <li>Failure to pay may result in suspension of services</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 Candidate Data</h3>
              <p className="text-gray-600">
                Employers may access candidate information only for recruitment purposes. You may not use candidate data for marketing, selling, or any other purpose without explicit consent. Misuse of candidate data may result in immediate account termination and legal action.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Prohibited Conduct</h2>
              <p className="text-gray-600 mb-3">You agree NOT to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Post false, misleading, or fraudulent content</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Post discriminatory, offensive, or illegal content</li>
                <li>Scrape, copy, or harvest data from the platform</li>
                <li>Attempt to gain unauthorized access to accounts or systems</li>
                <li>Transmit viruses, malware, or malicious code</li>
                <li>Impersonate another person or entity</li>
                <li>Spam users with unsolicited messages</li>
                <li>Interfere with the proper functioning of the Service</li>
                <li>Use automated tools (bots, scripts) without permission</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Our Content</h3>
              <p className="text-gray-600 mb-4">
                The WantokJobs platform, including its design, features, software, content, and trademarks, is owned by WantokJobs and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our content without written permission.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Your Content</h3>
              <p className="text-gray-600 mb-4">
                You retain ownership of content you upload (resumes, profiles, job postings). By uploading content, you grant WantokJobs a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content for the purpose of providing the Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 User-Generated Content</h3>
              <p className="text-gray-600">
                We reserve the right to remove any content that violates these Terms or is otherwise objectionable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Disclaimer of Warranties</h2>
              <p className="text-gray-600 mb-3">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Accuracy, completeness, or reliability of content</li>
                <li>Availability or uninterrupted access to the Service</li>
                <li>Fitness for a particular purpose</li>
                <li>Security or freedom from errors</li>
              </ul>
              <p className="text-gray-600">
                WantokJobs is a platform that connects job seekers with employers. We do not guarantee job placement, hiring outcomes, or the quality of candidates or employers. Users are responsible for their own interactions and decisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WANTOKJOBS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Loss of profits, revenue, or data</li>
                <li>Business interruption</li>
                <li>Missed job opportunities or hiring errors</li>
                <li>Fraudulent activity by other users</li>
                <li>Unauthorized access to your account</li>
              </ul>
              <p className="text-gray-600">
                Our total liability for any claims arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or K100, whichever is greater.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Indemnification</h2>
              <p className="text-gray-600">
                You agree to indemnify and hold harmless WantokJobs, its affiliates, officers, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another person or entity</li>
                <li>Content you post or upload</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
              <p className="text-gray-600 mb-4">
                We reserve the right to suspend or terminate your account at any time, with or without notice, for violations of these Terms, fraudulent activity, or any other reason we deem appropriate.
              </p>
              <p className="text-gray-600 mb-4">
                You may terminate your account at any time by contacting us or using the account deletion feature. Upon termination, your access to the Service will cease, but certain provisions of these Terms will survive (including payment obligations, disclaimers, and limitations of liability).
              </p>
              <p className="text-gray-600">
                Paid subscriptions are non-refundable upon termination unless otherwise required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Dispute Resolution</h2>
              <p className="text-gray-600 mb-4">
                If a dispute arises between you and WantokJobs, we encourage you to contact us first to seek an informal resolution. We are committed to resolving issues fairly and promptly.
              </p>
              <p className="text-gray-600">
                If informal resolution fails, disputes shall be resolved through binding arbitration in Port Moresby, Papua New Guinea, in accordance with the laws of Papua New Guinea. You waive the right to participate in class action lawsuits.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law</h2>
              <p className="text-gray-600">
                These Terms are governed by the laws of Papua New Guinea, without regard to conflict of law principles. Any legal action or proceeding arising from these Terms shall be brought exclusively in the courts of Papua New Guinea.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Miscellaneous</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.1 Entire Agreement</h3>
              <p className="text-gray-600 mb-4">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and WantokJobs regarding the Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.2 Severability</h3>
              <p className="text-gray-600 mb-4">
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.3 No Waiver</h3>
              <p className="text-gray-600 mb-4">
                Our failure to enforce any provision of these Terms shall not constitute a waiver of that provision or our right to enforce it in the future.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.4 Assignment</h3>
              <p className="text-gray-600">
                You may not assign or transfer these Terms or your account without our written consent. We may assign these Terms at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="text-gray-600 mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Mail className="w-5 h-5 text-primary-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Email:</p>
                    <a href="mailto:legal@wantokjobs.com" className="text-primary-600 hover:text-primary-700">
                      legal@wantokjobs.com
                    </a>
                  </div>
                </div>
                <div className="text-gray-600">
                  <p className="font-medium text-gray-900 mb-1">Postal Address:</p>
                  <p>WantokJobs<br />
                  Downtown Building<br />
                  Port Moresby, NCD<br />
                  Papua New Guinea</p>
                </div>
              </div>
            </section>
          </div>

          {/* Acknowledgment Box */}
          <div className="mt-8 bg-primary-50 rounded-lg p-6 text-center border-2 border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-2">By using WantokJobs, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</h3>
          </div>
        </div>
      </div>
    </>
  );
}
