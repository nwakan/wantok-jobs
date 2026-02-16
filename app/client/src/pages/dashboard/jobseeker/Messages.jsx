import { useState, useEffect } from 'react';
import { messages } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function Messages() {
  const [messageList, setMessageList] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const data = await messages.getAll();
      setMessageList(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Placeholder data
      setMessageList([
        {
          id: 1,
          from_name: 'Tech Corp',
          subject: 'Application Update - Senior Developer Position',
          message: 'Thank you for applying. We would like to schedule an interview...',
          read: false,
          created_at: new Date().toISOString(),
          from_type: 'employer',
        },
        {
          id: 2,
          from_name: 'Admin Team',
          subject: 'Welcome to WantokJobs!',
          message: 'Thank you for registering. Here are some tips to get started...',
          read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          from_type: 'admin',
        },
        {
          id: 3,
          from_name: 'StartUp Inc',
          subject: 'Interview Invitation',
          message: 'We are impressed with your profile and would like to invite you for an interview...',
          read: true,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          from_type: 'employer',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = async (message) => {
    setSelectedMessage(message);
    setReplyText('');
    
    if (!message.read) {
      try {
        await messages.markRead(message.id);
        setMessageList(messageList.map(m => 
          m.id === message.id ? { ...m, read: true } : m
        ));
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    try {
      await messages.send({
        recipient_id: selectedMessage.from_id,
        subject: `Re: ${selectedMessage.subject}`,
        message: replyText,
      });
      showToast('Reply sent successfully', 'success');
      setReplyText('');
    } catch (error) {
      showToast('Failed to send reply', 'error');
    }
  };

  const unreadCount = messageList.filter(m => !m.read).length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Messages Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            {messageList.length === 0 ? (
              <p className="p-6 text-center text-gray-500">No messages</p>
            ) : (
              messageList.map(message => (
                <div
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className={`p-4 cursor-pointer transition-colors ${
                    !message.read ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${selectedMessage?.id === message.id ? 'bg-gray-100' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className={`font-semibold text-sm ${
                      !message.read ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {message.from_name}
                    </p>
                    {!message.read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {message.subject}
                  </p>
                  <p className="text-xs text-gray-500 truncate mb-1">
                    {message.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      message.from_type === 'admin' 
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {message.from_type === 'admin' ? 'Admin' : 'Employer'}
                    </span>
                    <p className="text-xs text-gray-400">
                      {new Date(message.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          {!selectedMessage ? (
            <div className="text-center py-12 text-gray-500">
              Select a message to view
            </div>
          ) : (
            <div>
              <div className="border-b pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedMessage.subject}
                </h2>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">{selectedMessage.from_name}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(selectedMessage.created_at).toLocaleString()}</span>
                  <span className="mx-2">•</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedMessage.from_type === 'admin' 
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedMessage.from_type === 'admin' ? 'Admin' : 'Employer'}
                  </span>
                </div>
              </div>

              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>

              {selectedMessage.from_type !== 'admin' && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Reply</h3>
                  <form onSubmit={handleReply}>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                      rows="6"
                      placeholder="Type your reply here..."
                      required
                    />
                    <button
                      type="submit"
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Send Reply
                    </button>
                  </form>
                </div>
              )}

              {selectedMessage.from_type === 'admin' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-800 text-sm">
                    ℹ️ This is a system message from the admin team. You cannot reply directly.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
