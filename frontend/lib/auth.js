import { apiClient, storeTokens, clearTokens, storeUser, getStoredUser } from './api';
import constants from './constants';

const auth = {
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    const { user, tokens } = response.data;
    storeTokens(tokens.accessToken, tokens.refreshToken);
    storeUser(user);
    return { user, tokens };
  },
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    const { user, tokens } = response.data;
    storeTokens(tokens.accessToken, tokens.refreshToken);
    storeUser(user);
    return { user, tokens };
  },
  logout() {
    clearTokens();
    if (typeof window !== 'undefined') window.location.href = constants.ROUTES.HOME;
  },
  async getCurrentUser() {
    const stored = getStoredUser();
    if (stored) return stored;
    try {
      const response = await apiClient.get('/auth/me');
      storeUser(response.data.user);
      return response.data.user;
    } catch { clearTokens(); return null; }
  },
  isAuthenticated() {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('roostay_access_token');
  },
  getUserRole() {
    const user = getStoredUser();
    return user?.role || null;
  },
  redirectToDashboard() {
    if (typeof window === 'undefined') return;
    const role = this.getUserRole();
    const map = { guest: constants.ROUTES.GUEST_DASHBOARD, host: constants.ROUTES.HOST_DASHBOARD, admin: constants.ROUTES.ADMIN_DASHBOARD };
    window.location.href = map[role] || constants.ROUTES.HOME;
  },
};

export default auth;
