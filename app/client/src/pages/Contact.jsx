import { useState } from 'react';
import { Mail, Phone, MapPin, MessageSquare, Send, Facebook, Linkedin, Twitter, Instagram, Clock, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import api from '../api';

const faqs = [
  { q: 'How do I create an account on WantokJobs?', a: 'Click "Register" at the top of the page, choose whether you\'re a jobseeker or employer, fill in your details, and verify your email. It only takes a minute!' },
  { q: 'Is it free to search and apply for jobs?', a: 'Yes! Searching and applying for jobs on WantokJobs is completely free for jobseekers. Simply create an account and start applying.' },
  { q: 'How do I post a job as an employer?', a: 'Log in to your employer account, go to your dashboard, and click "Post a Job". Fill in the job details, select a package, and publish. Your job will be visible to thousands of jobseekers across PNG and the Pacific.' },
  { q: 'How long does it take to get a response?', a: 'For support enquiries, we aim to respond within 24 hours during business days. For job applications, response times depend on the employer.' },
  { q: 'Can I use WantokJobs on my mobile phone?', a: 'Absolutely! WantokJobs is fully mobile-friendly. You can browse jobs, apply, and manage your account from any smartphone or tablet.' },
];

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      await api.post('/contact', formData);
      setStatus({ type: 'success', message: 'Thank you! Your message has been sent successfully. We\'ll get back to you soon.' });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to send message. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <>
      <PageHead title="Contact Us" description="Get in touch with WantokJobs. We're here to help job seekers and employers across PNG and the Pacific Islands." />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Have questions? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Contact Information */}
            <div className="md:col-span-1 space-y-6">
              {/* Office */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-100 rounded-lg"><MapPin className="w-6 h-6 text-primary-600" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Office Location</h3>
                    <p className="text-gray-600 text-sm">Downtown Building<br />Port Moresby, NCD<br />Papua New Guinea</p>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg"><Clock className="w-6 h-6 text-amber-600" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Business Hours</h3>
                    <div className="text-gray-600 text-sm space-y-1">
                      <p>Monday – Friday: 8:00 AM – 5:00 PM</p>
                      <p>Saturday: 9:00 AM – 12:00 PM</p>
                      <p>Sunday & Public Holidays: Closed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-100 rounded-lg"><Mail className="w-6 h-6 text-primary-600" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Email Us</h3>
                    <a href="mailto:info@wantokjobs.com" className="text-primary-600 hover:text-primary-700 text-sm">info@wantokjobs.com</a>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-100 rounded-lg"><Phone className="w-6 h-6 text-primary-600" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Call Us</h3>
                    <a href="tel:+67575830582" className="text-primary-600 hover:text-primary-700 text-sm block">+675 7583 0582</a>
                  </div>
                </div>
              </div>

              {/* WhatsApp Button */}
              <a
                href="https://wa.me/67583460582"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg transition shadow-sm"
              >
                <MessageSquare className="w-6 h-6" />
                Chat with us on WhatsApp
              </a>

              {/* Social Media */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Follow Us</h3>
                <div className="flex gap-3">
                  <a href="#" className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"><Facebook className="w-5 h-5" /></a>
                  <a href="#" className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"><Linkedin className="w-5 h-5" /></a>
                  <a href="#" className="p-2 bg-sky-100 text-sky-500 rounded-lg hover:bg-sky-200 transition"><Twitter className="w-5 h-5" /></a>
                  <a href="#" className="p-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition"><Instagram className="w-5 h-5" /></a>
                </div>
              </div>

              {/* Help Center Link */}
              <Link to="/help" className="flex items-center justify-center gap-2 w-full bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold py-3 px-6 rounded-lg transition border border-primary-200">
                <HelpCircle className="w-5 h-5" />
                Visit our Help Center
              </Link>
            </div>

            {/* Contact Form + Map */}
            <div className="md:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>

                {status.message && (
                  <div className={`mb-6 p-4 rounded-lg ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {status.message}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input type="text" id="name" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="John Doe" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input type="email" id="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="john@example.com" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                    <input type="text" id="subject" name="subject" required value={formData.subject} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="How can we help?" />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                    <textarea id="message" name="message" required value={formData.message} onChange={handleChange} rows={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" placeholder="Tell us more about your inquiry..." />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading ? 'Sending...' : <><Send className="w-5 h-5" />Send Message</>}
                  </button>
                </form>
              </div>

              {/* Map */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Find Us</h2>
                <div className="rounded-lg overflow-hidden" style={{ height: '300px' }}>
                  <iframe
                    title="WantokJobs Office Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31370.!2d147.15!3d-9.475!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6902379ba1cd3d1f%3A0x1a8e3d5e1d3c4e0!2sPort+Moresby%2C+Papua+New+Guinea!5e0!3m2!1sen!2s!4v1700000000000"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              {/* FAQ Snippets */}
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-4 text-left font-medium text-gray-900 hover:bg-gray-50 transition"
                      >
                        {faq.q}
                        {openFaq === i ? <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                      </button>
                      {openFaq === i && <div className="px-4 pb-4 text-gray-600">{faq.a}</div>}
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link to="/help" className="text-primary-600 hover:text-primary-700 font-medium">
                    View all help articles →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
