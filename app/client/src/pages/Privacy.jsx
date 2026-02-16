import { Shield, Mail } from 'lucide-react';
import PageHead from '../components/PageHead';

export default function Privacy() {
  return (
    <>
      <PageHead
        title="Privacy Policy"
        description="WantokJobs Privacy Policy - How we collect, use, and protect your personal information."
      />
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600">
              Last updated: February 16, 2026
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm p-8 prose prose-primary max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-600 mb-4">
                WantokJobs ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our job platform and services in Papua New Guinea and the Pacific region.
              </p>
              <p className="text-gray-600">
                By using WantokJobs, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.1 Personal Information</h3>
              <p className="text-gray-600 mb-3">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Name, email address, phone number, and postal address</li>
                <li>Resume/CV, work history, education, and skills</li>
                <li>Job preferences and career goals</li>
                <li>Profile photo and other uploaded documents</li>
                <li>Company information (for employer accounts)</li>
                <li>Payment information (for paid services)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, time spent, clicks)</li>
                <li>Location data (with your permission)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.3 Information from Third Parties</h3>
              <p className="text-gray-600">
                We may receive information about you from third-party services if you choose to connect your account (e.g., social media login, LinkedIn profile import).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-600 mb-3">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Match job seekers with relevant opportunities</li>
                <li>Send job alerts via email, SMS, and WhatsApp</li>
                <li>Process job applications and connect candidates with employers</li>
                <li>Verify employer accounts and prevent fraud</li>
                <li>Analyze usage patterns and improve user experience</li>
                <li>Send service updates, newsletters, and promotional materials (with your consent)</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Share Your Information</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 With Employers</h3>
              <p className="text-gray-600 mb-4">
                When you apply for a job, we share your profile, resume, and application information with the employer. You control which information is visible on your public profile.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Service Providers</h3>
              <p className="text-gray-600 mb-4">
                We work with third-party service providers who assist us with email delivery, SMS/WhatsApp notifications, payment processing, analytics, and hosting. These providers have access to your information only to perform these tasks on our behalf.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Legal Requirements</h3>
              <p className="text-gray-600 mb-4">
                We may disclose your information if required by law, court order, or government request, or to protect the rights, property, or safety of WantokJobs, our users, or others.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.4 Business Transfers</h3>
              <p className="text-gray-600">
                If WantokJobs is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-600 mb-3">
                We implement appropriate technical and organizational security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>SSL/TLS encryption for data transmission</li>
                <li>Secure password hashing</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
                <li>Employee training on data protection</li>
              </ul>
              <p className="text-gray-600">
                However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights and Choices</h2>
              <p className="text-gray-600 mb-3">You have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and personal data</li>
                <li><strong>Objection:</strong> Object to processing of your data for certain purposes</li>
                <li><strong>Portability:</strong> Request your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing emails or adjust notification preferences</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies and Tracking</h2>
              <p className="text-gray-600 mb-3">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Remember your preferences and settings</li>
                <li>Analyze site traffic and usage patterns</li>
                <li>Provide personalized content and job recommendations</li>
                <li>Measure the effectiveness of our marketing campaigns</li>
              </ul>
              <p className="text-gray-600">
                You can control cookies through your browser settings, but disabling cookies may limit your ability to use certain features.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Children's Privacy</h2>
              <p className="text-gray-600">
                WantokJobs is not intended for users under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfers</h2>
              <p className="text-gray-600">
                Your information may be transferred to and processed in countries outside Papua New Guinea. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Policy</h2>
              <p className="text-gray-600">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last Updated" date. Continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Mail className="w-5 h-5 text-primary-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Email:</p>
                    <a href="mailto:privacy@wantokjobs.com" className="text-primary-600 hover:text-primary-700">
                      privacy@wantokjobs.com
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

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Governing Law</h2>
              <p className="text-gray-600">
                This Privacy Policy is governed by the laws of Papua New Guinea. Any disputes arising from this policy shall be subject to the exclusive jurisdiction of the courts of Papua New Guinea.
              </p>
            </section>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-primary-50 rounded-lg p-6 text-center">
            <h3 className="font-semibold text-gray-900 mb-2">Need to manage your data?</h3>
            <p className="text-gray-600 mb-4">Access your account settings to update preferences or request data deletion.</p>
            <a
              href="/dashboard"
              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
