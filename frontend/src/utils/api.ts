import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  baseURL: '/api', // This will be proxied by Vite in dev and Nginx in prod
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401s (token expiration)
// Simple implementation for MVP - in a real app, you'd try to refresh the token here
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login if auth fails
      // However, avoid infinite loops if the failing request was a login request
      if (error.config.url !== '/auth/login' && error.config.url !== '/auth/me') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
