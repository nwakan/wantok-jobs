import { useState, useEffect, useRef, useCallback } from 'react';
import { conversations } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';

export default function Messages() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [convList, setConvList] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await conversations.list();
      setConvList(data?.data || []);
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (convId) => {
    try {
      const data = await conversations.get(convId);
      setMsgs(data?.messages || []);
      // Update unread in sidebar
      setConvList(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Poll for new messages
  useEffect(() => {
    const poll = () => {
      loadConversations();
      if (selectedConv) loadMessages(selectedConv.id);
    };
    pollRef.current = setInterval(poll, 30000);
    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [selectedConv, loadConversations, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const handleSelectConv = async (conv) => {
    setSelectedConv(conv);
    await loadMessages(conv.id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedConv) return;
    setSending(true);
    try {
      const data = await conversations.sendMessage(selectedConv.id, newMsg.trim());
      setMsgs(prev => [...prev, data.message]);
      setNewMsg('');
      // Update last message in sidebar
      setConvList(prev => prev.map(c =>
        c.id === selectedConv.id
          ? { ...c, last_message: newMsg.trim(), last_message_at: new Date().toISOString() }
          : c
      ));
    } catch (e) {
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const totalUnread = convList.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        {totalUnread > 0 && (
          <p className="text-sm text-gray-600 mt-1">{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '500px' }}>
        {/* Conversation List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700">Conversations</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {convList.length === 0 ? (
              <p className="p-6 text-center text-gray-500">No conversations yet. Message an applicant from their application page.</p>
            ) : (
              convList.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className={`p-4 cursor-pointer transition-colors ${
                    conv.unread_count > 0 ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${selectedConv?.id === conv.id ? 'bg-gray-100 border-l-4 border-primary-600' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-sm text-gray-900">{conv.jobseeker_name}</p>
                    {conv.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">{conv.unread_count}</span>
                    )}
                  </div>
                  {conv.job_title && (
                    <p className="text-xs text-primary-600 mb-1">Re: {conv.job_title}</p>
                  )}
                  <p className="text-xs text-gray-500 truncate">{conv.last_message || 'No messages yet'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to view messages
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-900">{selectedConv.jobseeker_name}</h2>
                {selectedConv.job_title && (
                  <p className="text-sm text-primary-600">Re: {selectedConv.job_title}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[450px]">
                {msgs.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No messages yet</p>
                ) : (
                  msgs.map(msg => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isMe ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
                <input
                  type="text"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMsg.trim()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
