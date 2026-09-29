import User from '../models/User.model';
import Company, { ICompany } from '../models/Company.model';
import { getCompanyById } from './company.service';
import {
  calculateFinancialMetrics,
  IFinancialAnalysis,
  IFinancialMetricDetail,
} from './analysis.service';
import { runCompanyRagPipeline } from './rag';

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
  profitability: IFinancialAnalysis['profitability'];
  valuation: IFinancialAnalysis['valuation'];
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
  lastUpdated: Date;
}

export interface PersonalizedDashboardData {
  monthlyInvestmentBudget: number;
  currency: string;
  profileCompleted: boolean;
  companies: DashboardCompanySummary[];
  lastUpdated: string;
}

const deriveFinancialRisks = (
  company: ICompany,
  analysis: IFinancialAnalysis
): string[] => {
  const risks: string[] = [];

  // Leverage Risk
  if (analysis.debtToEquity.value !== null && analysis.debtToEquity.value > 1.5) {
    risks.push(
      `Elevated Leverage: Debt-to-Equity is ${analysis.debtToEquity.value}, indicating total debt significantly exceeds equity.`
    );
  }

  // Cash Flow Risk
  if (analysis.freeCashFlow.value !== null && analysis.freeCashFlow.value < 0) {
    risks.push(
      `Cash Burn: Free Cash Flow is negative (₹${analysis.freeCashFlow.value} Cr in ${analysis.freeCashFlow.reportingPeriod || 'latest period'}).`
    );
  }

  // Profitability / Margin Risk
  if (
    analysis.profitability.netProfitMargin !== null &&
    analysis.profitability.netProfitMargin < 0
  ) {
    risks.push(
      `Operating Losses: Net Profit Margin is negative (${analysis.profitability.netProfitMargin}%).`
    );
  }

  // Growth Contraction Risk
  if (
    analysis.profitability.revenueGrowthYoY !== null &&
    analysis.profitability.revenueGrowthYoY < 0
  ) {
    risks.push(
      `Revenue Contraction: YoY revenue declined by ${Math.abs(analysis.profitability.revenueGrowthYoY)}%.`
    );
  }

  // High Valuation Multiples
  if (analysis.valuation.peRatio !== null && analysis.valuation.peRatio > 60) {
    risks.push(
      `High Valuation Multiple: P/E ratio is elevated at ${analysis.valuation.peRatio}, signaling high growth expectations already priced in.`
    );
  }

  // Near 52-Week Low
  if (
    company.sharePrice !== null &&
    company.low52Week !== null &&
    company.sharePrice <= company.low52Week * 1.05
  ) {
    risks.push(
      `Price Weakness: Currently trading within 5% of its 52-week low (₹${company.low52Week}).`
    );
  }

  // Data Freshness & Auditing Notice
  if (!company.financialStatements || company.financialStatements.length === 0) {
    risks.push(
      'Information Gap: Detailed financial statement records are not fully indexed for this company.'
    );
  }

  // If no high-severity risks identified, provide standard baseline market risk notice
  if (risks.length === 0) {
    risks.push(
      'Market & Sectoral Risk: Equity investments are subject to sector cyclicality, raw material price shifts, and broader market volatility.'
    );
  }

  return risks;
};

const getPersonalizedDashboard = async (
  userId: string
): Promise<PersonalizedDashboardData> => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User not found') as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  const profile = user.financialProfile;

  // Validate financial profile completeness
  if (
    !profile ||
    !profile.isCompleted ||
    profile.monthlyInvestmentBudget === null ||
    profile.monthlyInvestmentBudget === undefined ||
    profile.monthlyInvestmentBudget <= 0
  ) {
    const error = new Error(
      'Financial profile is incomplete. Please complete your profile to access the personalized dashboard.'
    ) as Error & { statusCode: number; data?: Record<string, unknown> };
    error.statusCode = 400;
    error.data = {
      profileCompleted: false,
      requiredFields: ['age', 'monthlySalary', 'monthlyInvestmentBudget'],
    };
    throw error;
  }

  const userBudget = profile.monthlyInvestmentBudget;

  // Fetch verified Indian companies from MongoDB
  const companies = await Company.find().sort({ marketCap: -1, companyName: 1 });

  const dashboardCompanies: DashboardCompanySummary[] = companies.map((company) => {
    const analysis = calculateFinancialMetrics(company);
    const risks = deriveFinancialRisks(company, analysis);

    let scenarioSummary: DashboardCompanySummary['hypotheticalScenarioSummary'] = null;

    if (company.sharePrice && company.sharePrice > 0) {
      const wholeShares = Math.floor(userBudget / company.sharePrice);
      const amountInvested = parseFloat((wholeShares * company.sharePrice).toFixed(2));
      const unallocatedCash = parseFloat((userBudget - amountInvested).toFixed(2));

      scenarioSummary = {
        monthlyBudget: userBudget,
        purchasableShares: wholeShares,
        amountInvested,
        unallocatedCash,
        sharePrice: company.sharePrice,
      };
    }

    return {
      companyId: company._id.toString(),
      companyName: company.companyName,
      symbol: company.symbol,
      sector: company.sector,
      latestSharePrice: company.sharePrice,
      marketCap: company.marketCap,
      freeCashFlow: analysis.freeCashFlow,
      returnOnEquity: analysis.returnOnEquity,
      debtToEquity: analysis.debtToEquity,
      profitability: analysis.profitability,
      valuation: analysis.valuation,
      historicalStockPriceData: {
        high52Week: company.high52Week,
        low52Week: company.low52Week,
      },
      financialRisks: risks,
      hypotheticalScenarioSummary: scenarioSummary,
      dataSource: company.dataSource || 'Screener.in',
      reportingPeriod: analysis.reportingPeriod,
      lastUpdated: company.lastUpdated,
    };
  });

  return {
    monthlyInvestmentBudget: userBudget,
    currency: profile.currency || 'INR',
    profileCompleted: true,
    companies: dashboardCompanies,
    lastUpdated: new Date().toISOString(),
  };
};

const getPersonalizedCompanyAnalysis = async (
  companyId: string,
  userId?: string
) => {
  const company = await getCompanyById(companyId);
  const analysis = calculateFinancialMetrics(company);
  const risks = deriveFinancialRisks(company, analysis);

  let budgetSuitability: {
    monthlyBudget: number | null;
    purchasableShares: number | null;
    suitabilityNote: string;
  } | null = null;

  if (userId) {
    const user = await User.findById(userId);
    if (user?.financialProfile?.monthlyInvestmentBudget) {
      const budget = user.financialProfile.monthlyInvestmentBudget;
      const sharePrice = company.sharePrice;

      if (sharePrice && sharePrice > 0) {
        const wholeShares = Math.floor(budget / sharePrice);
        budgetSuitability = {
          monthlyBudget: budget,
          purchasableShares: wholeShares,
          suitabilityNote:
            wholeShares > 0
              ? `Your monthly investment budget of ₹${budget.toLocaleString('en-IN')} can acquire ${wholeShares} whole share${wholeShares > 1 ? 's' : ''} at ₹${sharePrice} each, with ₹${(budget - wholeShares * sharePrice).toLocaleString('en-IN')} remaining unallocated.`
              : `A single share of ${company.companyName} costs ₹${sharePrice}, which exceeds your current monthly budget of ₹${budget.toLocaleString('en-IN')}. Consider saving across multiple months or adjusting your budget.`,
        };
      }
    }
  }

  // Execute RAG pipeline for comprehensive analysis
  const ragResult = await runCompanyRagPipeline({
    companyId,
    query: `Provide a detailed financial analysis of ${company.companyName} (${company.symbol}). Explain its cash flow generation, return on equity, balance sheet leverage, and major business risks in clear, simple terms for an individual investor.`,
  });

  return {
    company: ragResult.company,
    financialMetrics: analysis,
    aiExplanation: ragResult.answer,
    financialRisks: risks,
    budgetSuitability,
    sources: ragResult.sources,
    reportingPeriods: ragResult.reportingPeriods,
    lastUpdated: company.lastUpdated,
  };
};

export {
  getPersonalizedDashboard,
  getPersonalizedCompanyAnalysis,
  deriveFinancialRisks,
};
