// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5002';

export const config = {
  apiUrl: API_URL,
  socketUrl: SOCKET_URL,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// API Endpoints
export const apiEndpoints = {
  auth: {
    register: `${API_URL}/api/auth/register`,
    login: `${API_URL}/api/auth/login`,
    logout: `${API_URL}/api/auth/logout`,
    refresh: `${API_URL}/api/auth/refresh`,
    verify: `${API_URL}/api/auth/verify`,
  },
  rides: {
    list: `${API_URL}/api/rides`,
    create: `${API_URL}/api/rides`,
    get: (id) => `${API_URL}/api/rides/${id}`,
    update: (id) => `${API_URL}/api/rides/${id}`,
    delete: (id) => `${API_URL}/api/rides/${id}`,
  },
  payments: {
    create: `${API_URL}/api/payments/create`,
    verify: `${API_URL}/api/payments/verify`,
  },
};

export default config;
