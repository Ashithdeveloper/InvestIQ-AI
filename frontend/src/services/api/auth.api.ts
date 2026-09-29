import apiClient from './apiClient';
import { ApiResponse, AuthData, LoginPayload, SignupPayload, User } from '../../types';

export const authApi = {
  async signup(payload: SignupPayload): Promise<AuthData> {
    const res = await apiClient.post<ApiResponse<AuthData>>('/auth/signup', payload);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Signup failed');
    }
    return res.data.data;
  },

  async login(payload: LoginPayload): Promise<AuthData> {
    const res = await apiClient.post<ApiResponse<AuthData>>('/auth/login', payload);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Login failed');
    }
    return res.data.data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await apiClient.get<ApiResponse<User | { user: User }>>('/auth/me');
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to fetch current user');
    }
    const raw = res.data.data;
    const user: User = (raw as { user?: User }).user ? (raw as { user: User }).user : (raw as User);
    return { user };
  },
};
