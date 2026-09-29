import { create } from 'zustand';
import {
  FinancialAnalysisData,
  BuyAnalysisData,
  BuyAnalysisPayload,
  SellAnalysisData,
  SellAnalysisPayload,
} from '../types';
import { analysisApi } from '../services/api/analysis.api';

interface AnalysisState {
  analysis: FinancialAnalysisData | null;
  isLoading: boolean;
  error: string | null;

  buyAnalysis: BuyAnalysisData | null;
  isBuyLoading: boolean;
  buyError: string | null;

  sellAnalysis: SellAnalysisData | null;
  isSellLoading: boolean;
  sellError: string | null;

  fetchAnalysis: (companyId: string) => Promise<FinancialAnalysisData | null>;
  fetchBuyAnalysis: (payload: BuyAnalysisPayload) => Promise<BuyAnalysisData | null>;
  fetchSellAnalysis: (payload: SellAnalysisPayload) => Promise<SellAnalysisData | null>;
  clearAnalysis: () => void;
  clearBuyAnalysis: () => void;
  clearSellAnalysis: () => void;
  clearError: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  analysis: null,
  isLoading: false,
  error: null,

  buyAnalysis: null,
  isBuyLoading: false,
  buyError: null,

  sellAnalysis: null,
  isSellLoading: false,
  sellError: null,

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

  async fetchBuyAnalysis(payload: BuyAnalysisPayload): Promise<BuyAnalysisData | null> {
    set({ isBuyLoading: true, buyError: null });
    try {
      const data = await analysisApi.getBuyAnalysis(payload);
      set({ buyAnalysis: data, isBuyLoading: false, buyError: null });
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI buy analysis';
      set({ isBuyLoading: false, buyError: msg });
      return null;
    }
  },

  async fetchSellAnalysis(payload: SellAnalysisPayload): Promise<SellAnalysisData | null> {
    set({ isSellLoading: true, sellError: null });
    try {
      const data = await analysisApi.getSellAnalysis(payload);
      set({ sellAnalysis: data, isSellLoading: false, sellError: null });
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI sell analysis';
      set({ isSellLoading: false, sellError: msg });
      return null;
    }
  },

  clearAnalysis(): void {
    set({ analysis: null });
  },

  clearBuyAnalysis(): void {
    set({ buyAnalysis: null, buyError: null });
  },

  clearSellAnalysis(): void {
    set({ sellAnalysis: null, sellError: null });
  },

  clearError(): void {
    set({ error: null, buyError: null, sellError: null });
  },
}));

