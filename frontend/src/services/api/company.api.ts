import apiClient from './apiClient';
import { ApiResponse, Company, CompanyListResponse } from '../../types';

export const companyApi = {
  async getCompanies(params?: {
    page?: number;
    limit?: number;
    sector?: string;
    search?: string;
  }): Promise<CompanyListResponse> {
    const res = await apiClient.get<ApiResponse<CompanyListResponse>>('/companies', {
      params,
    });
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to fetch companies');
    }
    return res.data.data;
  },

  async searchCompanies(query: string, page = 1, limit = 10): Promise<CompanyListResponse> {
    const res = await apiClient.get<ApiResponse<CompanyListResponse>>('/companies/search', {
      params: { q: query, page, limit },
    });
    if (!res.data.data) {
      throw new Error(res.data.message || 'Search failed');
    }
    return res.data.data;
  },

  async getCompanyById(idOrSymbol: string): Promise<Company> {
    const res = await apiClient.get<ApiResponse<{ company: Company }>>(
      `/companies/${idOrSymbol}`
    );
    if (!res.data.data?.company) {
      throw new Error(res.data.message || 'Company not found');
    }
    return res.data.data.company;
  },

  async getSectors(): Promise<string[]> {
    const res = await apiClient.get<ApiResponse<{ sectors: string[] }>>(
      '/companies/sectors'
    );
    return res.data.data?.sectors || [];
  },
};
