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

// baseURL her zaman: https://.../api (sonunda slash olmasın)
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

// 401 olduğunda event fırlat (hard redirect yok)
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

// Auth API
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  googleAuth: (sessionId) => api.post("/auth/google", { session_id: sessionId }),
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get("/dashboard/stats"),
};

// (İstersen diğer endpointleri sonra ekleriz; build için şart değil)

export default api;
