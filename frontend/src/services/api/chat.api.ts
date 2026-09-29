import apiClient from './apiClient';
import { ApiResponse, ChatServiceResponse, SendChatMessagePayload } from '../../types';

export const chatApi = {
  async sendMessage(payload: SendChatMessagePayload): Promise<ChatServiceResponse> {
    const res = await apiClient.post<ApiResponse<ChatServiceResponse>>('/ai/chat', payload);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to send chat message');
    }
    return res.data.data;
  },

  async runAiAnalysis(companyId: string, query: string): Promise<{ answer: string; sources: string[]; reportingPeriods: string[] }> {
    const res = await apiClient.post<
      ApiResponse<{ answer: string; sources: string[]; reportingPeriods: string[] }>
    >('/ai/company-analysis', {
      companyId,
      query,
    });
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to run AI analysis');
    }
    return res.data.data;
  },
};
