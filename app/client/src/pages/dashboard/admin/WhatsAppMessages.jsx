/**
 * Admin WhatsApp Messages Viewer
 * 
 * View and manage WhatsApp conversations from the admin dashboard.
 * 
 * Features:
 * - Conversation list with search and filters
 * - Message thread viewer with full conversation history
 * - Statistics dashboard with usage metrics
 * - Export conversations to CSV
 * 
 * @date 2026-05-07
 */

import React, { useState, useEffect } from 'react';

const WhatsAppMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messageThread, setMessageThread] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filter state
  const [search, setSearch] = useState('');
  const [registered, setRegistered] = useState('all');
  const [days, setDays] = useState(7);
  
  // Error/success message state
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // View state
  const [activeView, setActiveView] = useState('conversations'); // 'conversations', 'thread', 'stats'

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, [page, search, registered, days]);

  // Fetch statistics on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(registered !== 'all' && { registered: registered === 'registered' }),
        ...(days && { days: days.toString() })
      });

      const response = await fetch(`/api/admin/whatsapp-messages/conversations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
      setPage(data.pagination.page);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setMessage({ type: 'error', text: 'Failed to load WhatsApp conversations' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageThread = async (phoneNumber) => {
    setLoadingThread(true);
    try {
      const response = await fetch(`/api/admin/whatsapp-messages/thread/${encodeURIComponent(phoneNumber)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch message thread');
      }

      const data = await response.json();
      setMessageThread(data.messages || []);
      setSelectedPhone(data);
      setActiveView('thread');
    } catch (error) {
      console.error('Error fetching message thread:', error);
      setMessage({ type: 'error', text: 'Failed to load message thread' });
    } finally {
      setLoadingThread(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/whatsapp-messages/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setMessage({ type: 'error', text: 'Failed to load WhatsApp statistics' });
    }
  };

  const exportToCSV = () => {
    if (conversations.length === 0) {
      setMessage({ type: 'warning', text: 'No conversations to export' });
      return;
    }

    const csvContent = [
      ['Phone Number', 'User Email', 'User Name', 'Role', 'Messages', 'Last Activity', 'First Activity'].join(','),
      ...conversations.map(c => [
        c.phone_number,
        c.user_email || 'Not registered',
        c.user_name || 'Anonymous',
        c.user_role || 'N/A',
        c.message_count,
        c.last_message_at,
        c.first_message_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-conversations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Conversations exported to CSV' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderConversationsList = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Phone, email, or name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Registration Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Status
            </label>
            <select
              value={registered}
              onChange={(e) => setRegistered(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="registered">Registered Only</option>
              <option value="non-registered">Non-Registered Only</option>
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recent Activity
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="">All time</option>
            </select>
          </div>

          {/* Export Button */}
          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
              📊 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  Loading conversations...
                </td>
              </tr>
            ) : conversations.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No conversations found
                </td>
              </tr>
            ) : (
              conversations.map((conv) => (
                <tr key={conv.phone_number} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {conv.phone_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {conv.user_id ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {conv.user_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {conv.user_email}
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {conv.user_role}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Not Registered
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {conv.message_count} messages
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(conv.last_message_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => fetchMessageThread(conv.phone_number)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Messages
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span> ({total} total conversations)
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMessageThread = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
        <div>
          <button
            onClick={() => setActiveView('conversations')}
            className="text-blue-600 hover:text-blue-900 mb-2"
          >
            ← Back to Conversations
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedPhone?.phone_number}
          </h2>
          {selectedPhone?.user && (
            <p className="text-sm text-gray-600">
              {selectedPhone.user.name} ({selectedPhone.user.email}) - {selectedPhone.user.role}
            </p>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {messageThread.length} messages (of {selectedPhone?.total_messages} total)
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {loadingThread ? (
          <div className="text-center text-gray-500 py-8">
            Loading messages...
          </div>
        ) : messageThread.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages found
          </div>
        ) : (
          messageThread.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`text-xs mt-1 flex items-center gap-2 ${
                    msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}
                >
                  <span>{formatDate(msg.created_at)}</span>
                  {msg.intent && (
                    <span className="px-2 py-0.5 rounded bg-white/20">
                      {msg.intent}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Conversations</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.total_conversations || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Messages</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.total_messages || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Registered Users</div>
          <div className="text-2xl font-bold text-green-600">
            {stats?.registered_users || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Non-Registered</div>
          <div className="text-2xl font-bold text-gray-600">
            {stats?.non_registered_users || 0}
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Users</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Last 24 Hours</div>
            <div className="text-xl font-bold text-blue-600">
              {stats?.active_24h || 0}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Last 7 Days</div>
            <div className="text-xl font-bold text-blue-600">
              {stats?.active_7d || 0}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Last 30 Days</div>
            <div className="text-xl font-bold text-blue-600">
              {stats?.active_30d || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Messages by Day Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Messages by Day (Last 7 Days)</h3>
        <div className="space-y-2">
          {stats?.messages_by_day?.length > 0 ? (
            stats.messages_by_day.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-600">{day.date}</div>
                <div className="flex-1">
                  <div className="bg-blue-200 h-6 rounded" style={{ width: `${(day.count / Math.max(...stats.messages_by_day.map(d => d.count))) * 100}%` }}>
                    <span className="text-xs font-medium text-blue-900 px-2">{day.count}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">No data available</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Message Display */}
      {message.text && (
        <div
          className={`mb-4 p-4 rounded-lg border ${
            message.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Messages</h1>
        <p className="text-gray-600">View and manage WhatsApp conversations</p>
      </div>

      {/* View Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveView('conversations')}
            className={`${
              activeView === 'conversations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Conversations
          </button>
          <button
            onClick={() => setActiveView('stats')}
            className={`${
              activeView === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Statistics
          </button>
        </nav>
      </div>

      {/* View Content */}
      {activeView === 'conversations' && renderConversationsList()}
      {activeView === 'thread' && renderMessageThread()}
      {activeView === 'stats' && renderStats()}
    </div>
  );
};

export default WhatsAppMessages;