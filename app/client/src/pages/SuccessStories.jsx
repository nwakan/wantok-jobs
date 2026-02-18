import { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHead from '../components/PageHead';
import api from '../api';
import { useAuth } from '../context/AuthContext';

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

function TestimonialCard({ t, featured }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${featured ? 'md:col-span-2 lg:col-span-2' : ''}`}
    >
      <div className="flex items-start gap-4 mb-4">
        {t.photo_url ? (
          <img src={t.photo_url} alt={t.name} className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
            {t.name.charAt(0)}
          </div>
        )}
        <div>
          <h3 className="font-bold text-gray-900">{t.name}</h3>
          <p className="text-sm text-gray-500">{t.role}{t.company ? ` at ${t.company}` : ''}</p>
          <StarDisplay rating={t.rating} />
        </div>
      </div>
      <blockquote className={`text-gray-700 ${featured ? 'text-lg' : ''} leading-relaxed`}>
        "{t.quote}"
      </blockquote>
    </motion.div>
  );
}

export default function SuccessStories() {
  const { user } = useAuth() || {};
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Jobseeker', company: '', quote: '', rating: 5 });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/testimonials')
      .then(data => setTestimonials(data.testimonials || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const featured = testimonials.filter(t => t.featured);
  const regular = testimonials.filter(t => !t.featured);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/testimonials', form);
      setSubmitted(true);
      setShowForm(false);
      setForm({ name: '', role: 'Jobseeker', company: '', quote: '', rating: 5 });
    } catch {
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHead title="Success Stories | WantokJobs" description="Read how WantokJobs has helped people across PNG and the Pacific Islands find jobs and employers find talent." />

      <div className="bg-gradient-to-br from-primary-600 to-teal-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Success Stories</h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            Real stories from people across PNG and the Pacific who found opportunities through WantokJobs
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Share Your Story button */}
        <div className="text-center mb-10">
          {submitted ? (
            <div className="bg-green-50 text-green-700 px-6 py-3 rounded-lg inline-block">
              ✅ Thank you! Your story has been submitted for review.
            </div>
          ) : user ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition inline-flex items-center gap-2"
            >
              <Send className="w-5 h-5" /> Share Your Story
            </button>
          ) : (
            <p className="text-gray-500">
              <a href="/login" className="text-primary-600 underline">Log in</a> to share your success story
            </p>
          )}
        </div>

        {/* Submission form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto mb-12 bg-white rounded-xl shadow-lg p-6 border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Share Your Story</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option>Jobseeker</option>
                    <option>Employer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Story</label>
                <textarea required rows={4} value={form.quote} onChange={e => setForm({...form, quote: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="Tell us how WantokJobs helped you..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <button key={i} type="button" onClick={() => setForm({...form, rating: i})}>
                      <Star className={`w-6 h-6 ${i <= form.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Your Story'}
              </button>
            </form>
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading stories...</div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No stories yet. Be the first to share!</div>
        ) : (
          <>
            {/* Featured stories */}
            {featured.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {featured.map(t => <TestimonialCard key={t.id} t={t} featured />)}
              </div>
            )}

            {/* Regular stories */}
            {regular.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regular.map(t => <TestimonialCard key={t.id} t={t} />)}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
