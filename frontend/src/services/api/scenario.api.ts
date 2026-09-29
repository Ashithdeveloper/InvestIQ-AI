import apiClient from './apiClient';
import {
  ApiResponse,
  BudgetComparisonOutcome,
  CompareBudgetPayload,
  InvestmentScenarioOutcome,
  ScenarioPayload,
} from '../../types';

export const scenarioApi = {
  async calculateScenario(payload: ScenarioPayload): Promise<InvestmentScenarioOutcome> {
    const res = await apiClient.post<ApiResponse<InvestmentScenarioOutcome>>(
      '/investment/scenario',
      payload
    );
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to calculate investment scenario');
    }
    return res.data.data;
  },

  async compareBudgets(payload: CompareBudgetPayload): Promise<BudgetComparisonOutcome> {
    const res = await apiClient.post<ApiResponse<BudgetComparisonOutcome>>(
      '/investment/compare-budget',
      payload
    );
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to calculate budget comparison');
    }
    return res.data.data;
  },
};
