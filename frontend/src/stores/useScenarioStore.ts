import { create } from 'zustand';
import {
  BudgetComparisonOutcome,
  CompareBudgetPayload,
  InvestmentScenarioOutcome,
  ScenarioPayload,
} from '../types';
import { scenarioApi } from '../services/api/scenario.api';

interface ScenarioState {
  scenarioOutcome: InvestmentScenarioOutcome | null;
  comparisonOutcome: BudgetComparisonOutcome | null;
  isLoading: boolean;
  error: string | null;
  calculateScenario: (payload: ScenarioPayload) => Promise<InvestmentScenarioOutcome>;
  compareBudgets: (payload: CompareBudgetPayload) => Promise<BudgetComparisonOutcome>;
  clearOutcomes: () => void;
  clearError: () => void;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  scenarioOutcome: null,
  comparisonOutcome: null,
  isLoading: false,
  error: null,

  async calculateScenario(payload: ScenarioPayload): Promise<InvestmentScenarioOutcome> {
    set({ isLoading: true, error: null });
    try {
      const outcome = await scenarioApi.calculateScenario(payload);
      set({ scenarioOutcome: outcome, isLoading: false, error: null });
      return outcome;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scenario calculation failed';
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  async compareBudgets(payload: CompareBudgetPayload): Promise<BudgetComparisonOutcome> {
    set({ isLoading: true, error: null });
    try {
      const outcome = await scenarioApi.compareBudgets(payload);
      set({ comparisonOutcome: outcome, isLoading: false, error: null });
      return outcome;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Budget comparison failed';
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  clearOutcomes(): void {
    set({ scenarioOutcome: null, comparisonOutcome: null });
  },

  clearError(): void {
    set({ error: null });
  },
}));
