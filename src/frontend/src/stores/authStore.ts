import { create } from 'zustand';
import api from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  githubUsername?: string;
  onboardingComplete: boolean;
  profileId?: string;
  starredJobCount: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('sm_token'),
  isAuthenticated: false,
  loading: false,
  error: null,

  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', { email, password, name });
      localStorage.setItem('sm_token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Registration failed', loading: false });
      throw err;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('sm_token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Login failed', loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('sm_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem('sm_token');
    if (!token) {
      set({ isAuthenticated: false, loading: false });
      return;
    }
    set({ loading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, token, isAuthenticated: true, loading: false });
    } catch {
      localStorage.removeItem('sm_token');
      set({ user: null, token: null, isAuthenticated: false, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
