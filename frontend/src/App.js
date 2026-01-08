import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vetflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vetflow_token');
      localStorage.removeItem('vetflow_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (sessionId) => api.post('/auth/google', { session_id: sessionId }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

// Customers API
export const customersAPI = {
  getAll: (search) => api.get('/customers', { params: { search } }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`)
};

// Pets API
export const petsAPI = {
  getAll: (customerId) => api.get('/pets', { params: { customer_id: customerId } }),
  getOne: (id) => api.get(`/pets/${id}`),
  getHistory: (id) => api.get(`/pets/${id}/history`),
  create: (data) => api.post('/pets', data),
  update: (id, data) => api.put(`/pets/${id}`, data),
  delete: (id) => api.delete(`/pets/${id}`)
};

// Health Records API
export const healthRecordsAPI = {
  getAll: (petId) => api.get('/health-records', { params: { pet_id: petId } }),
  create: (data) => api.post('/health-records', data)
};

// Appointments API
export const appointmentsAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getDetails: (id) => api.get(`/appointments/${id}/details`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
  cancel: (id) => api.post(`/appointments/${id}/cancel`)
};

// Products API
export const productsAPI = {
  getAll: (category) => api.get('/products', { params: { category } }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`)
};

// Pet Product Usage API
export const petProductUsageAPI = {
  getAll: (petId) => api.get('/pet-product-usage', { params: { pet_id: petId } }),
  create: (data) => api.post('/pet-product-usage', data)
};

// Reminders API
export const remindersAPI = {
  getAll: (sent) => api.get('/reminders', { params: { sent } }),
  create: (data) => api.post('/reminders', data),
  delete: (id) => api.delete(`/reminders/${id}`)
};

// Transactions API
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  getSummary: (params) => api.get('/finance/summary', { params })
};

// WhatsApp API
export const whatsappAPI = {
  getMessages: (phone) => api.get('/whatsapp/messages', { params: { phone } }),
  sendMessage: (phone, message) => api.post('/whatsapp/send', { phone, message })
};

// AI Settings API
export const aiSettingsAPI = {
  get: () => api.get('/ai-settings'),
  update: (data) => api.put('/ai-settings', data)
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats')
};

// Subscription API
export const subscriptionAPI = {
  getPlans: () => api.get('/subscription/plans'),
  getCurrent: () => api.get('/subscription/current'),
  getLimits: () => api.get('/subscription/limits'),
  startTrial: () => api.post('/subscription/start-trial'),
  createCheckout: (planId) => api.post('/subscription/checkout', {
    plan_id: planId,
    origin_url: window.location.origin
  }),
  createResponsePackCheckout: (packId) => api.post('/subscription/response-pack/checkout', {
    pack_id: packId,
    origin_url: window.location.origin
  }),
  getPaymentStatus: (sessionId) => api.get(`/subscription/payment/status/${sessionId}`)
};

export default api;
