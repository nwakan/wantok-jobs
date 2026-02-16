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

// Categories
export const categories = {
  getAll: () =>
    fetch(`${API_URL}/categories`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  create: (categoryData) =>
    fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData),
    }).then(handleResponse),

  update: (id, categoryData) =>
    fetch(`${API_URL}/categories/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData),
    }).then(handleResponse),

  delete: (id) =>
    fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Plans
export const plans = {
  getAll: () =>
    fetch(`${API_URL}/plans`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  create: (planData) =>
    fetch(`${API_URL}/plans`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(planData),
    }).then(handleResponse),

  update: (id, planData) =>
    fetch(`${API_URL}/plans/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(planData),
    }).then(handleResponse),

  delete: (id) =>
    fetch(`${API_URL}/plans/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Orders
export const orders = {
  create: (data) =>
    fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getMy: () =>
    fetch(`${API_URL}/orders/my`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  getAll: () =>
    fetch(`${API_URL}/orders/admin/all`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  updateStatus: (id, status) =>
    fetch(`${API_URL}/orders/${id}/status`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(handleResponse),
};

// Screening
export const screening = {
  getQuestions: (jobId) =>
    fetch(`${API_URL}/screening/jobs/${jobId}/questions`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  addQuestions: (jobId, questions) =>
    fetch(`${API_URL}/screening/jobs/${jobId}/questions`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    }).then(handleResponse),

  submitAnswers: (appId, answers) =>
    fetch(`${API_URL}/screening/applications/${appId}/answers`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    }).then(handleResponse),
};

// Job Alerts
export const jobAlerts = {
  getAll: () =>
    fetch(`${API_URL}/job-alerts`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  create: (data) =>
    fetch(`${API_URL}/job-alerts`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  update: (id, data) =>
    fetch(`${API_URL}/job-alerts/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  remove: (id) =>
    fetch(`${API_URL}/job-alerts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Saved Resumes
export const savedResumes = {
  getAll: () =>
    fetch(`${API_URL}/saved-resumes`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  save: (userId) =>
    fetch(`${API_URL}/saved-resumes/${userId}`, {
      method: 'POST',
      headers: getAuthHeader(),
    }).then(handleResponse),

  remove: (userId) =>
    fetch(`${API_URL}/saved-resumes/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Messages
export const messages = {
  getAll: () =>
    fetch(`${API_URL}/messages`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  get: (id) =>
    fetch(`${API_URL}/messages/${id}`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  send: (data) =>
    fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  markRead: (id) =>
    fetch(`${API_URL}/messages/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Companies
export const companies = {
  getAll: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/companies?${queryString}`, {
      headers: getAuthHeader(),
    }).then(handleResponse);
  },

  get: (id) =>
    fetch(`${API_URL}/companies/${id}`, {
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Analytics
export const analytics = {
  employerOverview: () =>
    fetch(`${API_URL}/analytics/employer/overview`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  adminOverview: () =>
    fetch(`${API_URL}/analytics/admin/overview`, {
      headers: getAuthHeader(),
    }).then(handleResponse),
};

// Contact
export const contact = {
  send: (data) =>
    fetch(`${API_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getAll: () =>
    fetch(`${API_URL}/contact`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  updateStatus: (id, status) =>
    fetch(`${API_URL}/contact/${id}/status`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(handleResponse),
};

// Admin API (additional methods)
export const adminAPI = {
  getOrders: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/orders/admin/all?${queryString}`, {
      headers: getAuthHeader(),
    }).then(handleResponse);
  },

  getReports: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/analytics/admin/overview?${queryString}`, {
      headers: getAuthHeader(),
    }).then(handleResponse);
  },
};

// Default export for convenience
const api = {
  get: (url) => fetch(`${API_URL}${url.startsWith('/') ? url.replace('/api','') : '/' + url}`, { headers: getAuthHeader() }).then(handleResponse),
  post: (url, data) => fetch(`${API_URL}${url.startsWith('/') ? url.replace('/api','') : '/' + url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(data) }).then(handleResponse),
  put: (url, data) => fetch(`${API_URL}${url.startsWith('/') ? url.replace('/api','') : '/' + url}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(data) }).then(handleResponse),
  delete: (url) => fetch(`${API_URL}${url.startsWith('/') ? url.replace('/api','') : '/' + url}`, { method: 'DELETE', headers: getAuthHeader() }).then(handleResponse),
};
export default api;
