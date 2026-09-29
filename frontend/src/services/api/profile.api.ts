import apiClient from './apiClient';
import {
  ApiResponse,
  CreateFinancialProfilePayload,
  FinancialProfile,
  UpdateFinancialProfilePayload,
} from '../../types';

export const profileApi = {
  async getProfile(): Promise<FinancialProfile> {
    const res = await apiClient.get<
      ApiResponse<{ userId: string; financialProfile: FinancialProfile }>
    >('/profile/financial');
    if (!res.data.data?.financialProfile) {
      throw new Error(res.data.message || 'Failed to fetch financial profile');
    }
    return res.data.data.financialProfile;
  },

  async createProfile(payload: CreateFinancialProfilePayload): Promise<FinancialProfile> {
    const res = await apiClient.post<
      ApiResponse<{ userId: string; financialProfile: FinancialProfile }>
    >('/profile/financial', payload);
    if (!res.data.data?.financialProfile) {
      throw new Error(res.data.message || 'Failed to save financial profile');
    }
    return res.data.data.financialProfile;
  },

  async updateProfile(payload: UpdateFinancialProfilePayload): Promise<FinancialProfile> {
    const res = await apiClient.put<
      ApiResponse<{ userId: string; financialProfile: FinancialProfile }>
    >('/profile/financial', payload);
    if (!res.data.data?.financialProfile) {
      throw new Error(res.data.message || 'Failed to update financial profile');
    }
    return res.data.data.financialProfile;
  },
};
