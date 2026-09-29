import apiClient from './apiClient';
import {
  ApiResponse,
  FinancialAnalysisData,
  BuyAnalysisData,
  BuyAnalysisPayload,
  SellAnalysisData,
  SellAnalysisPayload,
} from '../../types';

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

  async getBuyAnalysis(payload: BuyAnalysisPayload): Promise<BuyAnalysisData> {
    const res = await apiClient.post<ApiResponse<BuyAnalysisData>>(
      '/ai/buy-analysis',
      payload
    );
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to generate AI buy analysis');
    }
    return res.data.data;
  },

  async getSellAnalysis(payload: SellAnalysisPayload): Promise<SellAnalysisData> {
    const res = await apiClient.post<ApiResponse<SellAnalysisData>>(
      '/ai/sell-analysis',
      payload
    );
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to generate AI sell analysis');
    }
    return res.data.data;
  },
};

