import { useState, useEffect } from 'react';
import { admin as adminAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function ManageUsers() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => {
    loadUsers();
  }, [filter, pagination.page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { role: filter, page: pagination.page } : { page: pagination.page };
      const data = await adminAPI.getUsers(params);
      
      // Add mock profile completeness
      const usersWithMetrics = (data.data || []).map(user => ({
        ...user,
        profile_completeness: Math.floor(Math.random() * 40) + 60, // 60-100%
        last_active: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: Math.random() > 0.2 ? 'active' : 'suspended',
      }));
      
      setUsers(usersWithMetrics);
      setPagination({ page: data.page || 1, totalPages: data.totalPages || 1 });
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId, action) => {
    const confirmMessage = action === 'delete' 
      ? 'Are you sure you want to delete this user? This action cannot be undone.'
      : `Are you sure you want to ${action} this user?`;
      
    if (!confirm(confirmMessage)) return;

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast(`User ${action}ed successfully`, 'success');
      loadUsers();
    } catch (error) {
      showToast(`Failed to ${action} user: ${error.message}`, 'error');
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllUsers = () => {
    setSelectedUsers(prev =>
      prev.length === filteredUsers.length ? [] : filteredUsers.map(u => u.id)
    );
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      showToast('Please select users first', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to ${action} ${selectedUsers.length} user(s)?`)) return;

    try {
      const result = await adminAPI.bulkUsers(action, selectedUsers);
      showToast(`Bulk ${action} completed: ${result.affected} user(s) affected`, 'success');
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      showToast('Bulk action failed: ' + error.message, 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm('Are you sure you want to change this user\'s role?')) return;

    try {
      await adminAPI.updateUser(userId, { role: newRole });
      showToast('Role updated successfully', 'success');
      loadUsers();
    } catch (error) {
      showToast('Failed to update user: ' + error.message, 'error');
    }
  };

  const filteredUsers = users.filter(user =>
    !searchTerm ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'cards' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            📋 Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            📊 Table
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setFilter('jobseeker')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'jobseeker' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Jobseekers
            </button>
            <button
              onClick={() => setFilter('employer')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'employer' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Employers
            </button>
            <button
              onClick={() => setFilter('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'admin' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Admins
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
              >
                Activate Selected
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium"
              >
                Deactivate Selected
              </button>
              <button
                onClick={() => handleBulkAction('reset-password')}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
              >
                Reset Passwords
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select All */}
      <div className="bg-white rounded-lg shadow-sm px-6 py-3 mb-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
          onChange={toggleSelectAllUsers}
          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
        />
        <span className="text-sm font-medium text-gray-700">Select All</span>
      </div>

      {/* Content */}
      {viewMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              {/* Checkbox */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleUserSelection(user.id)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-xs text-gray-400">Select</span>
              </div>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xl">
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{user.name}</h3>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Role Badge */}
              <div className="mb-4">
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : user.role === 'employer'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {user.role}
                </span>
                <span
                  className={`ml-2 inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    user.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.status}
                </span>
              </div>

              {/* Profile Completeness */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-600">Profile Completeness</span>
                  <span className="text-xs font-bold text-primary-600">{user.profile_completeness}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      user.profile_completeness >= 80 ? 'bg-green-500' :
                      user.profile_completeness >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${user.profile_completeness}%` }}
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-600 space-y-1 mb-4">
                <p>Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                <p>Last active: {new Date(user.last_active).toLocaleDateString()}</p>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                >
                  <option value="jobseeker">Job Seeker</option>
                  <option value="employer">Employer</option>
                  <option value="admin">Admin</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAction(user.id, 'view')}
                    className="px-3 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 text-sm font-medium"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => handleAction(user.id, user.status === 'active' ? 'suspend' : 'activate')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      user.status === 'active'
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {user.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleAction(user.id, 'reset-password')}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                  >
                    Reset Pass
                  </button>
                  <button
                    onClick={() => handleAction(user.id, 'delete')}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAllUsers}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'employer'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              user.profile_completeness >= 80 ? 'bg-green-500' :
                              user.profile_completeness >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${user.profile_completeness}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{user.profile_completeness}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm mr-2"
                      >
                        <option value="jobseeker">Job Seeker</option>
                        <option value="employer">Employer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
