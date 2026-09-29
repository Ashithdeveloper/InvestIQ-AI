import { create } from 'zustand';
import { User, LoginPayload, SignupPayload } from '../types';
import { authApi } from '../services/api/auth.api';
import { tokenStorage } from '../services/storage/tokenStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: true,
  error: null,

  async login(payload: LoginPayload): Promise<void> {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login(payload);
      await tokenStorage.saveToken(data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      set({ isLoading: false, error: msg, isAuthenticated: false });
      throw err;
    }
  },

  async signup(payload: SignupPayload): Promise<void> {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.signup(payload);
      await tokenStorage.saveToken(data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      set({ isLoading: false, error: msg, isAuthenticated: false });
      throw err;
    }
  },

  async logout(): Promise<void> {
    await tokenStorage.removeToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  async restoreSession(): Promise<void> {
    set({ isRestoring: true });
    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        set({ isRestoring: false, isAuthenticated: false });
        return;
      }
      const data = await authApi.getMe();
      set({
        user: data.user,
        token,
        isAuthenticated: true,
        isRestoring: false,
      });
    } catch {
      await tokenStorage.removeToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isRestoring: false,
      });
    }
  },

  clearError(): void {
    set({ error: null });
  },
}));
