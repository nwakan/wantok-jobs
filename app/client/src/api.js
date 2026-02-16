const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Auth
export const auth = {
  register: (userData) =>
    fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }).then(handleResponse),

  login: (credentials) =>
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then(handleResponse),

  getMe: () =>
    fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  changePassword: (passwordData) =>
    fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordData),
    }).then(handleResponse),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return Promise.resolve();
  },
};

// Jobs
export const jobs = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/jobs?${queryString}`).then(handleResponse);
  },

  getMy: () =>
    fetch(`${API_URL}/jobs/my`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  getById: (id) => fetch(`${API_URL}/jobs/${id}`).then(handleResponse),

  create: (jobData) =>
    fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    }).then(handleResponse),

  update: (id, jobData) =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    }).then(handleResponse),

  delete: (id) =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Applications
export const applications = {
  create: (applicationData) =>
    fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(applicationData),
    }).then(handleResponse),

  getMy: () =>
    fetch(`${API_URL}/applications/my`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  getForJob: (jobId) =>
    fetch(`${API_URL}/applications/job/${jobId}`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  updateStatus: (id, status) =>
    fetch(`${API_URL}/applications/${id}/status`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(handleResponse),
};

// Profile
export const profile = {
  get: () =>
    fetch(`${API_URL}/profile`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  update: (profileData) =>
    fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    }).then(handleResponse),

  getPublic: (userId) =>
    fetch(`${API_URL}/profile/${userId}`).then(handleResponse),
};

// Saved Jobs
export const savedJobs = {
  save: (jobId) =>
    fetch(`${API_URL}/saved-jobs/${jobId}`, {
      method: 'POST',
      headers: getAuthHeader(),
    }).then(handleResponse),

  unsave: (jobId) =>
    fetch(`${API_URL}/saved-jobs/${jobId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  getAll: () =>
    fetch(`${API_URL}/saved-jobs`, {
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Notifications
export const notifications = {
  getAll: () =>
    fetch(`${API_URL}/notifications`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  markRead: (id) =>
    fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeader(),
    }).then(handleResponse),

  markAllRead: () =>
    fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Admin
export const admin = {
  getStats: () =>
    fetch(`${API_URL}/admin/stats`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  getUsers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/admin/users?${queryString}`, {
      headers: getAuthHeader(),
    }).then(handleResponse);
  },

  updateUser: (id, userData) =>
    fetch(`${API_URL}/admin/users/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }).then(handleResponse),

  getJobs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/admin/jobs?${queryString}`, {
      headers: getAuthHeader(),
    }).then(handleResponse);
  },

  deleteJob: (id) =>
    fetch(`${API_URL}/admin/jobs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),
};
