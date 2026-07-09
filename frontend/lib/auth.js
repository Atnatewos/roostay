// frontend/lib/auth.js
// Authentication helpers using httpOnly cookies
// No longer handles token storage in localStorage
import { apiClient } from './api';
import constants from './constants';

const auth = {
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data.user;
  },
  
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data.user;
  },
  
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Logout API failed, clearing local state anyway.', e);
    }
    if (typeof window !== 'undefined') {
      window.location.href = constants.ROUTES.HOME;
    }
  },
  
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.user;
    } catch {
      return null;
    }
  },
  
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  },
  
  getUserRole(user) {
    return user?.role || null;
  },
  
  redirectToDashboard(role) {
    if (typeof window === 'undefined') return;
    const map = { 
      guest: constants.ROUTES.GUEST_DASHBOARD, 
      host: constants.ROUTES.HOST_DASHBOARD, 
      admin: constants.ROUTES.ADMIN_DASHBOARD 
    };
    window.location.href = map[role] || constants.ROUTES.HOME;
  },
};

export default auth;