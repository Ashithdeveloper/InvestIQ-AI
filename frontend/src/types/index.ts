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
  financialProfile?: FinancialProfile;
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
  riskPercentage?: number;
  riskLevel?: string;
  profitPercentage?: number;
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

export interface IPricePoint {
  date: string;
  price: number;
  timestamp?: number;
}

export interface ITimeframeData {
  timeframe: '1D' | '5D' | '1M' | '6M' | '1Y';
  changePercent: number;
  changeAmount: number;
  high: number;
  low: number;
  startPrice: number;
  endPrice: number;
  points: IPricePoint[];
}

export interface IPricePerformance {
  currentPrice: number | null;
  high52Week: number | null;
  low52Week: number | null;
  timeframes?: {
    '1D': ITimeframeData;
    '5D': ITimeframeData;
    '1M': ITimeframeData;
    '6M': ITimeframeData;
    '1Y': ITimeframeData;
  };
  threeMonthChangePercent?: number;
  threeMonthHigh?: number;
  threeMonthLow?: number;
  history3Month?: IPricePoint[];
}

export interface ICompanyBasicDetails {
  companyName: string;
  symbol: string;
  sector: string;
  exchange: string[];
  marketCap: number | null;
  sharePrice: number | null;
  high52Week: number | null;
  low52Week: number | null;
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
  pricePerformance?: IPricePerformance;
  companyDetails?: ICompanyBasicDetails;
  geopoliticalWarImpact?: GeopoliticalWarImpact;
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
  riskPercentage?: number;
  riskLevel?: string;
  profitPercentage?: number;
  lastUpdated: string;
}

export interface AllocatedStock {
  companyId: string;
  symbol: string;
  companyName: string;
  sector: string;
  sharePrice: number;
  allocatedAmount: number;
  allocationPercentage: number;
  sharesToBuy: number;
  actualInvestedAmount: number;
  unallocatedCash: number;
  financialStrengthScore: number;
  keyStrengths: string[];
  isTopRecommendation?: boolean;
  riskPercentage?: number;
  riskLevel?: string;
  profitPercentage?: number;
}

export interface BoosterRecommendation {
  companyId: string;
  symbol: string;
  companyName: string;
  sector: string;
  sharePrice: number;
  currentAllocatedAmount: number;
  currentShares: number;
  suggestedExtraAmount: number;
  newTotalAmount: number;
  newTotalShares: number;
  currentProjectedReturnPercentage: number;
  boostedProjectedReturnPercentage: number;
  projectedReturnIncreasePercentage: number;
  analysisRationale: string;
}

export interface MonthlyAllocationPlan {
  totalMonthlyBudget: number;
  currency: string;
  totalAllocatedAmount: number;
  totalInvestedAmount: number;
  unallocatedCash: number;
  sectorCount: number;
  allocations: AllocatedStock[];
  topRecommendation: BoosterRecommendation;
}

export interface PersonalizedDashboardData {
  monthlyInvestmentBudget: number;
  currency: string;
  profileCompleted: boolean;
  monthlyAllocationPlan?: MonthlyAllocationPlan | null;
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
  isLiveScraped?: boolean;
  scrapedAt?: string;
  companyInfo?: {
    symbol?: string;
    companyName?: string;
    sharePrice?: number | null;
    high52Week?: number | null;
    low52Week?: number | null;
    peRatio?: number | null;
    roe?: number | null;
    roce?: number | null;
    opm?: number | null;
    debtToEquity?: number | null;
  };
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
  refreshData?: boolean;
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

export interface WarRiskFactor {
  factor: string;
  weightPercentage: number;
  direction: 'RISK_INCREASE' | 'HEDGE_BUFFER' | 'NEUTRAL';
  reason: string;
}

export interface GeopoliticalWarImpact {
  warRiskPercentage: number;
  warRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  primaryRiskReason: string;
  warRiskFactors: WarRiskFactor[];
  sectorSensitivity: 'VERY LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  vulnerabilityLevel: 'BENEFICIARY' | 'RESILIENT' | 'MODERATE IMPACT' | 'HIGH VULNERABILITY';
  summary: string;
  crudeAndEnergyImpact: string;
  currencyAndForexImpact: string;
  supplyChainAndInflationImpact: string;
  defenseOrGovernmentCatalyst?: string;
  keyVulnerabilities: string[];
  strategicMitigations: string[];
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
  geopoliticalWarImpact?: GeopoliticalWarImpact;
  riskPercentage?: number;
  riskLevel?: 'LOW' | 'MODERATE' | 'HIGH';
  riskReason?: string;
  profitPercentage?: number;
  profitReason?: string;
  hypotheticalScenarios?: HypotheticalScenarioOutcome[] | null;
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

