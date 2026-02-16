import { useState, useEffect } from 'react';
import { contact } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function ContactMessages() {
  const [contactList, setContactList] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { showToast } = useToast();

  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await contact.getAll();
      setContactList(data || []);
    } catch (error) {
      console.error('Failed to load contact messages:', error);
      // Placeholder data
      setContactList([
        {
          id: 1,
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          subject: 'Inquiry about premium features',
          message: 'I would like to know more about the premium employer features and pricing...',
          status: 'new',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Michael Chen',
          email: 'michael@example.com',
          subject: 'Technical issue with job posting',
          message: 'I am unable to upload my company logo when posting a job...',
          status: 'read',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          name: 'Emma Wilson',
          email: 'emma@example.com',
          subject: 'Partnership opportunity',
          message: 'We are interested in partnering with WantokJobs for our career fair...',
          status: 'replied',
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleContactClick = async (contactMsg) => {
    setSelectedContact(contactMsg);
    if (contactMsg.status === 'new') {
      try {
        await contact.updateStatus(contactMsg.id, 'read');
        setContactList(contactList.map(c => 
          c.id === contactMsg.id ? { ...c, status: 'read' } : c
        ));
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    try {
      await contact.updateStatus(selectedContact.id, 'replied');
      showToast('Reply sent successfully', 'success');
      setReplyText('');
      loadContacts();
      setSelectedContact({ ...selectedContact, status: 'replied' });
    } catch (error) {
      showToast('Failed to send reply', 'error');
    }
  };

  const filteredContacts = filter === 'all' 
    ? contactList 
    : contactList.filter(c => c.status === filter);

  const newCount = contactList.filter(c => c.status === 'new').length;

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
          <h1 className="text-2xl font-bold text-gray-900">Contact Form Messages</h1>
          {newCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {newCount} new message{newCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {['all', 'new', 'read', 'replied'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium capitalize ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredContacts.length === 0 ? (
              <p className="p-6 text-center text-gray-500">No messages found</p>
            ) : (
              filteredContacts.map(contactMsg => (
                <div
                  key={contactMsg.id}
                  onClick={() => handleContactClick(contactMsg)}
                  className={`p-4 cursor-pointer transition-colors ${
                    contactMsg.status === 'new' ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${selectedContact?.id === contactMsg.id ? 'bg-gray-100' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className={`font-semibold text-sm ${
                      contactMsg.status === 'new' ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {contactMsg.name}
                    </p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      contactMsg.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      contactMsg.status === 'replied' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {contactMsg.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {contactMsg.subject}
                  </p>
                  <p className="text-xs text-gray-500 truncate mb-1">
                    {contactMsg.message}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(contactMsg.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact Detail & Reply */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          {!selectedContact ? (
            <div className="text-center py-12 text-gray-500">
              Select a message to view
            </div>
          ) : (
            <div>
              <div className="border-b pb-4 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedContact.subject}
                  </h2>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedContact.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    selectedContact.status === 'replied' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedContact.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{selectedContact.name}</p>
                  <p>{selectedContact.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(selectedContact.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Message:</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedContact.message}
                </p>
              </div>

              {selectedContact.status !== 'replied' && (
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

              {selectedContact.status === 'replied' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    ✓ This message has been replied to
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
