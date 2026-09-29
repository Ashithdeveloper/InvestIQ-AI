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
    const res = await apiClient.get<ApiResponse<any>>(
      `/companies/${idOrSymbol}`
    );
    const company = res.data.data?.company || res.data.data;
    if (!company) {
      throw new Error(res.data.message || 'Company not found');
    }
    return company;
  },

  async findAndScrapeCompany(query: string): Promise<Company> {
    const res = await apiClient.post<ApiResponse<any>>(
      '/companies/find-and-scrape',
      { query }
    );
    const company = res.data.data?.company || res.data.data;
    if (!company) {
      throw new Error(res.data.message || 'Unable to find or scrape stock from Screener.in');
    }
    return company;
  },

  async getSectors(): Promise<string[]> {
    const res = await apiClient.get<ApiResponse<{ sectors: string[] }>>(
      '/companies/sectors'
    );
    return res.data.data?.sectors || [];
  },

  async liveSearch(query: string): Promise<LiveSearchResultItem[]> {
    if (!query || !query.trim()) return [];
    try {
      const res = await apiClient.get<ApiResponse<LiveSearchResultItem[]>>('/companies/live-search', {
        params: { q: query.trim() },
      });
      return res.data.data || [];
    } catch {
      return [];
    }
  },
};

export interface LiveSearchResultItem {
  id: string;
  name: string;
  symbol: string;
  sector?: string;
  sharePrice?: number | null;
  inDatabase: boolean;
  companyId?: string;
  url?: string;
}
