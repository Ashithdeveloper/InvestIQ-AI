import apiClient from './apiClient';
import { ApiResponse, FinancialAnalysisData } from '../../types';

export const analysisApi = {
  async getCompanyAnalysis(companyId: string): Promise<FinancialAnalysisData> {
    const res = await apiClient.get<ApiResponse<FinancialAnalysisData>>(
      `/analysis/company/${companyId}`
    );
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to fetch financial analysis');
    }
    return res.data.data;
  },
};
