import { create } from 'zustand';
import { FinancialAnalysisData } from '../types';
import { analysisApi } from '../services/api/analysis.api';

interface AnalysisState {
  analysis: FinancialAnalysisData | null;
  isLoading: boolean;
  error: string | null;
  fetchAnalysis: (companyId: string) => Promise<FinancialAnalysisData | null>;
  clearAnalysis: () => void;
  clearError: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  analysis: null,
  isLoading: false,
  error: null,

  async fetchAnalysis(companyId: string): Promise<FinancialAnalysisData | null> {
    set({ isLoading: true, error: null });
    try {
      const data = await analysisApi.getCompanyAnalysis(companyId);
      set({ analysis: data, isLoading: false, error: null });
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch analysis';
      set({ isLoading: false, error: msg });
      return null;
    }
  },

  clearAnalysis(): void {
    set({ analysis: null });
  },

  clearError(): void {
    set({ error: null });
  },
}));
