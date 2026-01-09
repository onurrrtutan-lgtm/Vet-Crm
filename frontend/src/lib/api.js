import axios from "axios";

/**
 * Render bazen env var'ı "undefined" / "null" string olarak set edebiliyor.
 * Bu yüzden sadece var mı diye değil, gerçekten URL mi diye kontrol ediyoruz.
 */
const RAW_ENV = process.env.REACT_APP_BACKEND_URL;

const RAW =
  typeof RAW_ENV === "string" &&
  RAW_ENV.trim() !== "" &&
  RAW_ENV.trim().toLowerCase() !== "undefined" &&
  RAW_ENV.trim().toLowerCase() !== "null"
    ? RAW_ENV.trim()
    : "https://vet-crm-fc39.onrender.com";

// baseURL: https://.../api (sonunda slash olmasın)
const BASE_URL = `${RAW.replace(/\/$/, "")}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // token bazlı auth -> false
  headers: { "Content-Type": "application/json" },
});

// Token’ı her request’e ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vetflow_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 => logout event (hard redirect yok)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem("vetflow_token");
      localStorage.removeItem("vetflow_user");
      window.dispatchEvent(new Event("vetflow:logout"));
    }
    return Promise.reject(error);
  }
);

// ===================== AUTH =====================
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  googleAuth: (sessionId) => api.post("/auth/google", { session_id: sessionId }),
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// ===================== CUSTOMERS =====================
export const customersAPI = {
  getAll: (search) => api.get("/customers", { params: { search } }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post("/customers", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// ===================== PETS =====================
export const petsAPI = {
  getAll: (customerId) => api.get("/pets", { params: { customer_id: customerId } }),
  getOne: (id) => api.get(`/pets/${id}`),
  getHistory: (id) => api.get(`/pets/${id}/history`),
  create: (data) => api.post("/pets", data),
  update: (id, data) => api.put(`/pets/${id}`, data),
  delete: (id) => api.delete(`/pets/${id}`),
};

// ===================== HEALTH RECORDS =====================
export const healthRecordsAPI = {
  getAll: (petId) => api.get("/health-records", { params: { pet_id: petId } }),
  create: (data) => api.post("/health-records", data),
};

// ===================== APPOINTMENTS =====================
export const appointmentsAPI = {
  getAll: (params) => api.get("/appointments", { params }),
  getDetails: (id) => api.get(`/appointments/${id}/details`),
  create: (data) => api.post("/appointments", data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
  cancel: (id) => api.post(`/appointments/${id}/cancel`),
};

// ===================== PRODUCTS =====================
export const productsAPI = {
  getAll: (category) => api.get("/products", { params: { category } }),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// ===================== PET PRODUCT USAGE =====================
export const petProductUsageAPI = {
  getAll: (petId) => api.get("/pet-product-usage", { params: { pet_id: petId } }),
  create: (data) => api.post("/pet-product-usage", data),
};

// ===================== REMINDERS =====================
export const remindersAPI = {
  getAll: (sent) => api.get("/reminders", { params: { sent } }),
  create: (data) => api.post("/reminders", data),
  delete: (id) => api.delete(`/reminders/${id}`),
};

// ===================== TRANSACTIONS / FINANCE =====================
export const transactionsAPI = {
  getAll: (params) => api.get("/transactions", { params }),
  create: (data) => api.post("/transactions", data),
  getSummary: (params) => api.get("/finance/summary", { params }),
};

// ===================== WHATSAPP =====================
export const whatsappAPI = {
  getMessages: (phone) => api.get("/whatsapp/messages", { params: { phone } }),
  sendMessage: (phone, message) => api.post("/whatsapp/send", { phone, message }),
};

// ===================== AI SETTINGS =====================
export const aiSettingsAPI = {
  get: () => api.get("/ai-settings"),
  update: (data) => api.put("/ai-settings", data),
};

// ===================== DASHBOARD =====================
export const dashboardAPI = {
  getStats: () => api.get("/dashboard/stats"),
};

// ===================== SUBSCRIPTION =====================
export const subscriptionAPI = {
  getPlans: () => api.get("/subscription/plans"),
  getCurrent: () => api.get("/subscription/current"),
  getLimits: () => api.get("/subscription/limits"),
  startTrial: () => api.post("/subscription/start-trial"),
  createCheckout: (planId) =>
    api.post("/subscription/checkout", {
      plan_id: planId,
      origin_url: window.location.origin,
    }),
  createResponsePackCheckout: (packId) =>
    api.post("/subscription/response-pack/checkout", {
      pack_id: packId,
      origin_url: window.location.origin,
    }),
  getPaymentStatus: (sessionId) => api.get(`/subscription/payment/status/${sessionId}`),
};

export default api;
