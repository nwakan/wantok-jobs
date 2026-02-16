import { useState, useEffect } from 'react';
import { messages } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function Messages() {
  const [messageList, setMessageList] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const { showToast } = useToast();

  const [composeData, setComposeData] = useState({
    recipient_id: '',
    subject: '',
    message: '',
  });

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
          from_name: 'John Employer',
          subject: 'Question about posting jobs',
          message: 'I need help understanding the job posting limits...',
          read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          from_name: 'Jane Jobseeker',
          subject: 'Profile verification issue',
          message: 'My profile verification has been pending for 3 days...',
          read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = async (message) => {
    setSelectedMessage(message);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      await messages.send(composeData);
      showToast('Message sent successfully', 'success');
      setShowCompose(false);
      setComposeData({ recipient_id: '', subject: '', message: '' });
      loadMessages();
    } catch (error) {
      showToast('Failed to send message', 'error');
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
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {showCompose ? 'Cancel' : 'Compose Message'}
        </button>
      </div>

      {/* Compose Form */}
      {showCompose && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">New Message</h2>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient User ID
              </label>
              <input
                type="text"
                value={composeData.recipient_id}
                onChange={e => setComposeData({ ...composeData, recipient_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter user ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={composeData.subject}
                onChange={e => setComposeData({ ...composeData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={composeData.message}
                onChange={e => setComposeData({ ...composeData, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="6"
                required
              />
            </div>

            <button 
              type="submit" 
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Send Message
            </button>
          </form>
        </div>
      )}

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
                    <p className={`font-semibold text-sm ${!message.read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {message.from_name}
                    </p>
                    {!message.read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{message.subject}</p>
                  <p className="text-xs text-gray-500 truncate">{message.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(message.created_at).toLocaleDateString()}
                  </p>
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
                </div>
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    setComposeData({
                      recipient_id: selectedMessage.from_id || '',
                      subject: `Re: ${selectedMessage.subject}`,
                      message: '',
                    });
                    setShowCompose(true);
                  }}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
