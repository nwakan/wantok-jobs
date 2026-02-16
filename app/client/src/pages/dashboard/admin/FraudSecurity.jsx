import { useState } from 'react';
import { useToast } from '../../../components/Toast';

export default function FraudSecurity() {
  const { showToast } = useToast();
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [ipToBlock, setIpToBlock] = useState('');

  // Placeholder data
  const [flaggedAccounts] = useState([
    {
      id: 1,
      user_id: 'U-1234',
      user_name: 'John Suspicious',
      email: 'suspicious@example.com',
      reason: 'Multiple fake job postings',
      flagged_at: new Date(Date.now() - 86400000).toISOString(),
      severity: 'high',
    },
    {
      id: 2,
      user_id: 'U-5678',
      user_name: 'Spam Company Inc',
      email: 'spam@company.com',
      reason: 'Spam applications to multiple jobs',
      flagged_at: new Date(Date.now() - 172800000).toISOString(),
      severity: 'medium',
    },
  ]);

  const [blockedIPs] = useState([
    { ip: '192.168.1.100', reason: 'DDoS attack', blocked_at: '2024-02-10', blocked_by: 'Admin' },
    { ip: '10.0.0.50', reason: 'Scraping attempts', blocked_at: '2024-02-12', blocked_by: 'System' },
    { ip: '172.16.0.25', reason: 'Spam submissions', blocked_at: '2024-02-14', blocked_by: 'Admin' },
  ]);

  const [suspiciousActivity] = useState([
    {
      id: 1,
      type: 'Multiple login attempts',
      user: 'user@example.com',
      ip: '203.0.113.45',
      time: new Date(Date.now() - 1800000).toISOString(),
      severity: 'high',
    },
    {
      id: 2,
      type: 'Rapid job applications',
      user: 'spammer@example.com',
      ip: '198.51.100.23',
      time: new Date(Date.now() - 3600000).toISOString(),
      severity: 'medium',
    },
    {
      id: 3,
      type: 'Suspicious profile creation',
      user: 'fake@example.com',
      ip: '192.0.2.100',
      time: new Date(Date.now() - 7200000).toISOString(),
      severity: 'low',
    },
  ]);

  const handleBlockIP = (e) => {
    e.preventDefault();
    showToast(`IP ${ipToBlock} blocked successfully`, 'success');
    setIpToBlock('');
    setShowBlockForm(false);
  };

  const handleUnblockIP = (ip) => {
    if (confirm(`Are you sure you want to unblock ${ip}?`)) {
      showToast(`IP ${ip} unblocked`, 'success');
    }
  };

  const handleAccountAction = (userId, action) => {
    showToast(`Account ${userId} ${action}`, 'success');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fraud & Security Dashboard</h1>

      {/* Flagged Accounts */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Flagged Accounts</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flagged</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {flaggedAccounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No flagged accounts
                  </td>
                </tr>
              ) : (
                flaggedAccounts.map(account => (
                  <tr key={account.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.user_name}
                      <p className="text-xs text-gray-500">{account.user_id}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {account.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        account.severity === 'high' ? 'bg-red-100 text-red-800' :
                        account.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {account.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(account.flagged_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleAccountAction(account.user_id, 'suspended')}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Suspend
                      </button>
                      <button
                        onClick={() => handleAccountAction(account.user_id, 'banned')}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Ban
                      </button>
                      <button
                        onClick={() => handleAccountAction(account.user_id, 'cleared')}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        Clear
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IP Blocks */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Blocked IP Addresses</h2>
          <button
            onClick={() => setShowBlockForm(!showBlockForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {showBlockForm ? 'Cancel' : 'Block New IP'}
          </button>
        </div>

        {showBlockForm && (
          <form onSubmit={handleBlockIP} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IP Address</label>
                <input
                  type="text"
                  value={ipToBlock}
                  onChange={e => setIpToBlock(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="192.168.1.1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Reason for blocking"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Block IP
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blocked Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blocked By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {blockedIPs.map((block, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {block.ip}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {block.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {block.blocked_at}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {block.blocked_by}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleUnblockIP(block.ip)}
                      className="text-green-600 hover:text-green-700 font-medium"
                    >
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspicious Activity Log */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Suspicious Activity Log</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suspiciousActivity.map(activity => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {activity.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activity.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {activity.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(activity.time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      activity.severity === 'high' ? 'bg-red-100 text-red-800' :
                      activity.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {activity.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
