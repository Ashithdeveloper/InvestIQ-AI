// ============================================================================
// INVESTIQ - AI FRONTEND TYPE DEFINITIONS
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
}

// ----------------------------------------------------------------------------
// 1. Auth Types
// ----------------------------------------------------------------------------
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
}

export interface AuthData {
  user: User;
  token: string;
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ----------------------------------------------------------------------------
// 2. Financial Profile Types
// ----------------------------------------------------------------------------
export interface FinancialProfile {
  age: number | null;
  monthlySalary: number | null;
  monthlyInvestmentBudget: number | null;
  currency: 'INR';
  isCompleted: boolean;
}

export interface CreateFinancialProfilePayload {
  age: number;
  monthlySalary: number;
  monthlyInvestmentBudget: number;
}

export type UpdateFinancialProfilePayload = Partial<CreateFinancialProfilePayload>;

// ----------------------------------------------------------------------------
// 3. Company & Exploration Types
// ----------------------------------------------------------------------------
export interface IFinancialMetrics {
  revenue: number | null;
  netProfit: number | null;
  freeCashFlow: number | null;
  roe: number | null;
  roce: number | null;
  debtToEquity: number | null;
  peRatio: number | null;
  bookValue: number | null;
  dividendYield: number | null;
  opm: number | null;
  eps: number | null;
}

export interface IFinancialStatementRow {
  metricName: string;
  values: (number | null)[];
}

export interface IFinancialStatement {
  statementType: 'Quarterly' | 'ProfitAndLoss' | 'BalanceSheet' | 'CashFlow' | 'Ratios';
  reportingPeriods: string[];
  rows: IFinancialStatementRow[];
}

export interface Company {
  _id: string;
  companyName: string;
  symbol: string;
  sector: string;
  profileUrl: string;
  exchange: string[];
  marketCap: number | null;
  sharePrice: number | null;
  high52Week: number | null;
  low52Week: number | null;
  financialMetrics: IFinancialMetrics;
  financialStatements?: IFinancialStatement[];
  dataSource: string;
  lastUpdated: string;
}

export interface CompanyListResponse {
  companies: Company[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ----------------------------------------------------------------------------
// 4. Financial Analysis Types
// ----------------------------------------------------------------------------
export interface IFinancialMetricDetail {
  value: number | null;
  unit?: string;
  methodology?: string;
  reportingPeriod: string | null;
  formula?: string;
}

export interface FinancialAnalysisData {
  companyId: string;
  symbol: string;
  companyName: string;
  reportingPeriod: string | null;
  dataSource: string;
  lastUpdated: string;
  freeCashFlow: IFinancialMetricDetail;
  returnOnEquity: IFinancialMetricDetail;
  debtToEquity: IFinancialMetricDetail;
  marketCapGrowth: {
    percentageGrowth: number | null;
    comparisonPeriod: string | null;
    currentValue?: number | null;
    previousValue?: number | null;
  };
  profitability: {
    revenueGrowthYoY: number | null;
    netProfitMargin: number | null;
    operatingProfitMargin: number | null;
    reportingPeriod: string | null;
  };
  valuation: {
    peRatio: number | null;
    pbRatio: number | null;
    evToEbitda: number | null;
    reportingPeriod: string | null;
  };
  insights: string[];
}

// ----------------------------------------------------------------------------
// 5. Dashboard Types
// ----------------------------------------------------------------------------
export interface DashboardCompanySummary {
  companyId: string;
  companyName: string;
  symbol: string;
  sector: string;
  latestSharePrice: number | null;
  marketCap: number | null;
  freeCashFlow: IFinancialMetricDetail;
  returnOnEquity: IFinancialMetricDetail;
  debtToEquity: IFinancialMetricDetail;
  profitability: FinancialAnalysisData['profitability'];
  valuation: FinancialAnalysisData['valuation'];
  historicalStockPriceData: {
    high52Week: number | null;
    low52Week: number | null;
  };
  financialRisks: string[];
  hypotheticalScenarioSummary: {
    monthlyBudget: number;
    purchasableShares: number;
    amountInvested: number;
    unallocatedCash: number;
    sharePrice: number;
  } | null;
  dataSource: string;
  reportingPeriod: string | null;
  lastUpdated: string;
}

export interface PersonalizedDashboardData {
  monthlyInvestmentBudget: number;
  currency: string;
  profileCompleted: boolean;
  companies: DashboardCompanySummary[];
  lastUpdated: string;
}

export interface PersonalizedCompanyAnalysisData {
  company: {
    id: string;
    symbol: string;
    companyName: string;
    sector: string;
    sharePrice: number | null;
    marketCap: number | null;
  };
  financialMetrics: FinancialAnalysisData;
  aiExplanation: string;
  financialRisks: string[];
  budgetSuitability: {
    monthlyBudget: number | null;
    purchasableShares: number | null;
    suitabilityNote: string;
  } | null;
  sources: string[];
  reportingPeriods: string[];
  lastUpdated: string;
}

// ----------------------------------------------------------------------------
// 6. Investment Scenario Types
// ----------------------------------------------------------------------------
export interface InvestmentScenarioOutcome {
  company: {
    id: string;
    symbol: string;
    companyName: string;
    currentSharePrice: number;
    currency: string;
    dataSource: string;
    lastUpdated: string;
  };
  scenarioInputs: {
    monthlyBudget: number;
    hypotheticalPriceChangePercent: number;
    investmentDurationMonths: number;
  };
  calculation: {
    wholeShares: number;
    amountInvested: number;
    unallocatedCash: number;
    hypotheticalNewPrice: number;
    estimatedValue: number;
    hypotheticalGainLoss: number;
    hypotheticalGainLossPercent: number;
    totalPortfolioValue: number;
  };
  assumptionsAndLimitations: string[];
  isHypothetical: true;
}

export interface BudgetComparisonOutcome {
  company: {
    id: string;
    symbol: string;
    companyName: string;
    currentSharePrice: number;
    currency: string;
    dataSource: string;
    lastUpdated: string;
  };
  currentScenario: InvestmentScenarioOutcome['calculation'] & {
    budget: number;
  };
  alternativeScenario: InvestmentScenarioOutcome['calculation'] & {
    budget: number;
  };
  comparison: {
    budgetDifference: number;
    additionalInvestedAmount: number;
    additionalShares: number;
    estimatedValueDifference: number;
    gainLossDifference: number;
  };
  riskAnalysis: {
    warning: string;
    lossExposureNote: string;
  };
  assumptionsAndLimitations: string[];
  isHypothetical: true;
}

export interface ScenarioPayload {
  companyId: string;
  monthlyBudget: number;
  hypotheticalPriceChangePercent: number;
  investmentDurationMonths?: number;
}

export interface CompareBudgetPayload {
  companyId: string;
  currentBudget: number;
  alternativeBudget: number;
  hypotheticalPriceChangePercent: number;
  investmentDurationMonths?: number;
}

// ----------------------------------------------------------------------------
// 7. AI & Chat Types
// ----------------------------------------------------------------------------
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  sources?: string[];
  reportingPeriods?: string[];
}

export interface ChatServiceResponse {
  sessionId: string;
  answer: string;
  sources: string[];
  reportingPeriods: string[];
  metrics: unknown;
  conversationHistoryLength: number;
}

export interface SendChatMessagePayload {
  companyId: string;
  message: string;
  sessionId?: string;
}

// ----------------------------------------------------------------------------
// 8. AI Buy & Sell Analysis Types
// ----------------------------------------------------------------------------
export interface HypotheticalScenarioOutcome {
  scenarioName: string;
  assumedChangePercent: number;
  projectedPrice: number;
  purchasableShares: number;
  investedCapital: number;
  unallocatedCash: number;
  projectedValue: number;
  projectedProfitLoss: number;
}

export interface BuyAnalysisData {
  companyName: string;
  stockSymbol: string;
  latestAvailablePrice: number | null;
  dataTimestamp: string;
  financialStrengths: string[];
  profitabilityAnalysis: {
    revenueGrowthYoY: number | null;
    netProfitMargin: number | null;
    operatingProfitMargin: number | null;
    reportingPeriod: string | null;
  };
  valuationAnalysis: {
    peRatio: number | null;
    pbRatio: number | null;
    evToEbitda: number | null;
    reportingPeriod: string | null;
  };
  historicalPerformance: {
    high52Week: number | null;
    low52Week: number | null;
    currentRangePositionPercent: number | null;
  };
  financialRisks: string[];
  hypotheticalScenarios: HypotheticalScenarioOutcome[] | null;
  budgetContext: {
    monthlyBudget: number | null;
    purchasableShares: number | null;
    note: string | null;
  } | null;
  keyAssumptions: string[];
  dataSources: string[];
  aiGeneratedExplanation: string;
  disclaimer: string;
}

export interface BuyAnalysisPayload {
  companyId: string;
  investmentAmount?: number;
  investmentDuration?: string | number;
}

export interface HypotheticalProfitLossOutcome {
  purchasePrice: number;
  currentPrice: number;
  quantityHeld: number;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  status: 'PROFIT' | 'LOSS' | 'BREAKEVEN';
}

export interface SellAnalysisData {
  companyName: string;
  stockSymbol: string;
  latestAvailablePrice: number | null;
  dataTimestamp: string;
  financialPerformanceChanges: string[];
  profitabilityChanges: {
    revenueGrowthYoY: number | null;
    netProfitMargin: number | null;
    operatingProfitMargin: number | null;
    reportingPeriod: string | null;
  };
  cashFlowAnalysis: {
    freeCashFlow: number | null;
    reportingPeriod: string | null;
    status: string;
  };
  debtAnalysis: {
    debtToEquity: number | null;
    reportingPeriod: string | null;
    leverageRisk: string;
  };
  valuationConsiderations: {
    peRatio: number | null;
    pbRatio: number | null;
    evaluation: string;
  };
  historicalPriceMovement: {
    high52Week: number | null;
    low52Week: number | null;
    currentPositionPercent: number | null;
  };
  potentialFinancialRisks: string[];
  reasonsToHold: string[];
  hypotheticalProfitLoss: HypotheticalProfitLossOutcome | null;
  sourceInformation: string[];
  aiGeneratedExplanation: string;
  disclaimer: string;
}

export interface SellAnalysisPayload {
  companyId: string;
  purchasePrice?: number;
  quantityHeld?: number;
  sharesHeld?: number;
}

