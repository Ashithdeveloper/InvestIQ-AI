import apiClient from './apiClient';
import {
  ApiResponse,
  PersonalizedCompanyAnalysisData,
  PersonalizedDashboardData,
} from '../../types';

export const dashboardApi = {
  async getDashboard(): Promise<PersonalizedDashboardData> {
    const res = await apiClient.get<ApiResponse<PersonalizedDashboardData>>('/dashboard');
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to fetch dashboard data');
    }
    return res.data.data;
  },

  async getPersonalizedCompanyAnalysis(
    companyId: string
  ): Promise<PersonalizedCompanyAnalysisData> {
    const res = await apiClient.post<ApiResponse<PersonalizedCompanyAnalysisData>>(
      '/dashboard/company-analysis',
      { companyId }
    );
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to generate personalized analysis');
    }
    return res.data.data;
  },
};
