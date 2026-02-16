import { useState, useEffect } from 'react';
import { Send, Eye, History, Users, Mail, TrendingUp } from 'lucide-react';

export default function AdminNewsletter() {
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('compose');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/newsletter/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/newsletter/history?limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handlePreview = async () => {
    if (!subject || !htmlContent) {
      setMessage({ type: 'error', text: 'Subject and content are required' });
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject,
          htmlContent,
          targetAudience,
          preview: true
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPreview(data);
        setMessage({ type: 'success', text: `Preview ready: ${data.recipientCount} recipients` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Preview failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate preview' });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!subject || !htmlContent) {
      setMessage({ type: 'error', text: 'Subject and content are required' });
      return;
    }

    if (!confirm(`Send newsletter to ${preview?.recipientCount || 'all'} subscribers?`)) {
      return;
    }

    setSending(true);
    setMessage({ type: 'info', text: 'Sending newsletter... This may take a few minutes.' });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject,
          htmlContent,
          targetAudience,
          preview: false
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Newsletter sent! ${data.sent} delivered, ${data.failed} failed`
        });
        setSubject('');
        setHtmlContent('');
        setPreview(null);
        fetchStats();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send newsletter' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Newsletter Manager</h1>
        <p className="mt-2 text-gray-600">Compose and send newsletters to subscribers</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Subscribers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubscribers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Employers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.employers}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jobseekers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.jobseekers}</p>
              </div>
              <Mail className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">+{stats.recentSubscribers}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Message Banner */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'error'
              ? 'bg-red-50 text-red-800'
              : message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-blue-50 text-blue-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('compose')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'compose'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Send className="inline h-4 w-4 mr-2" />
              Compose
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <History className="inline h-4 w-4 mr-2" />
              History
            </button>
          </nav>
        </div>

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="p-6">
            <div className="space-y-4">
              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                >
                  <option value="all">All Subscribers</option>
                  <option value="employers">Employers Only</option>
                  <option value="jobseekers">Jobseekers Only</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your weekly job digest..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              {/* HTML Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTML Content
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  rows={12}
                  placeholder="<h1>Hello!</h1><p>Your newsletter content here...</p>"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Unsubscribe footer will be added automatically
                </p>
              </div>

              {/* Preview Info */}
              {preview && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Preview Ready</h3>
                  <p className="text-sm text-blue-700">
                    <strong>{preview.recipientCount}</strong> recipients ({preview.targetAudience})
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Sample: {preview.sampleRecipients?.join(', ')}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  disabled={sending || !subject || !htmlContent}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !preview || !subject || !htmlContent}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Newsletter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-6">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No newsletters sent yet</p>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.subject}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Sent by {item.admin_name} on{' '}
                          {new Date(item.sent_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {item.target_audience}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm">
                      <span className="text-gray-600">
                        Recipients: <strong>{item.recipient_count}</strong>
                      </span>
                      <span className="text-green-600">
                        Sent: <strong>{item.sent_count}</strong>
                      </span>
                      {item.failed_count > 0 && (
                        <span className="text-red-600">
                          Failed: <strong>{item.failed_count}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
