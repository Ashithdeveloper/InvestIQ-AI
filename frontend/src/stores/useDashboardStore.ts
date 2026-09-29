import { create } from 'zustand';
import { PersonalizedDashboardData, PersonalizedCompanyAnalysisData } from '../types';
import { dashboardApi } from '../services/api/dashboard.api';

interface DashboardState {
  data: PersonalizedDashboardData | null;
  selectedPersonalizedAnalysis: PersonalizedCompanyAnalysisData | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  fetchCompanyPersonalizedAnalysis: (companyId: string) => Promise<void>;
  clearSelectedAnalysis: () => void;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  selectedPersonalizedAnalysis: null,
  isLoading: false,
  isAnalyzing: false,
  error: null,

  async fetchDashboard(): Promise<void> {
    set({ isLoading: true, error: null });
    try {
      const data = await dashboardApi.getDashboard();
      set({ data, isLoading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      set({ isLoading: false, error: msg });
    }
  },

  async fetchCompanyPersonalizedAnalysis(companyId: string): Promise<void> {
    set({ isAnalyzing: true, error: null });
    try {
      const analysis = await dashboardApi.getPersonalizedCompanyAnalysis(companyId);
      set({ selectedPersonalizedAnalysis: analysis, isAnalyzing: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      set({ isAnalyzing: false, error: msg });
    }
  },

  clearSelectedAnalysis(): void {
    set({ selectedPersonalizedAnalysis: null });
  },

  clearError(): void {
    set({ error: null });
  },
}));
