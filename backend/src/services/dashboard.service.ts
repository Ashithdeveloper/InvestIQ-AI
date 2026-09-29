import User from '../models/User.model';
import Company, { ICompany } from '../models/Company.model';
import { getCompanyById } from './company.service';
import {
  calculateFinancialMetrics,
  IFinancialAnalysis,
  IFinancialMetricDetail,
} from './analysis.service';
import { runCompanyRagPipeline } from './rag';
import { evaluateWarAndGeopoliticalImpact } from './buySellAnalysis.service';

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
  riskPercentage?: number;
  riskLevel?: string;
  profitPercentage?: number;
  dataSource: string;
  reportingPeriod: string | null;
  lastUpdated: Date;
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

const generateMonthlyAllocationPlan = (
  companies: ICompany[],
  userBudget: number
): MonthlyAllocationPlan => {
  // 1. Evaluate and score all companies with valid stock price
  const validCompanies = companies.filter(
    (c) => c.sharePrice !== null && c.sharePrice !== undefined && c.sharePrice > 0
  );

  const evaluated = validCompanies.map((c) => {
    const analysis = calculateFinancialMetrics(c);
    let score = 50;
    const strengths: string[] = [];

    // ROE scoring (max +25)
    const roe = analysis.returnOnEquity.value;
    if (roe !== null) {
      if (roe >= 20) {
        score += 25;
        strengths.push(`Stellar ROE of ${roe}%`);
      } else if (roe >= 15) {
        score += 20;
        strengths.push(`Strong ROE of ${roe}%`);
      } else if (roe >= 10) {
        score += 10;
        strengths.push(`ROE of ${roe}%`);
      } else if (roe <= 0) {
        score -= 15;
      }
    }

    // FCF scoring (max +20)
    const fcf = analysis.freeCashFlow.value;
    if (fcf !== null) {
      if (fcf > 1000) {
        score += 20;
        strengths.push(`High FCF (+₹${fcf.toLocaleString('en-IN')} Cr)`);
      } else if (fcf > 0) {
        score += 15;
        strengths.push(`Positive Cash Flow`);
      } else {
        score -= 10;
      }
    }

    // Debt/Equity scoring (max +20)
    const de = analysis.debtToEquity.value;
    if (de !== null) {
      if (de <= 0.1) {
        score += 20;
        strengths.push(`Virtually Debt-Free (D/E: ${de})`);
      } else if (de <= 0.5) {
        score += 15;
        strengths.push(`Low Leverage (D/E: ${de})`);
      } else if (de > 1.5) {
        score -= 15;
      }
    }

    // Profitability & Margins (max +15)
    const revGrowth = analysis.profitability.revenueGrowthYoY;
    const netMargin = analysis.profitability.netProfitMargin;
    if (revGrowth !== null && revGrowth > 10) {
      score += 10;
      strengths.push(`YoY Sales Growth (+${revGrowth}%)`);
    }
    if (netMargin !== null && netMargin > 15) {
      score += 10;
      strengths.push(`Net Margin (${netMargin}%)`);
    }

    // Valuation multiple sanity (max +10)
    const pe = analysis.valuation.peRatio;
    if (pe !== null && pe > 0 && pe <= 35) {
      score += 10;
      strengths.push(`Attractive P/E (${pe})`);
    }

    if (strengths.length === 0) {
      strengths.push('Established Indian Market Presence');
    }

    return {
      company: c,
      analysis,
      score: Math.min(98, Math.max(20, score)),
      strengths,
      sharePrice: c.sharePrice!,
    };
  });

  // 2. Ensure sector diversity: Pick highest scoring company per sector
  const sectorMap = new Map<string, (typeof evaluated)[0]>();
  for (const item of evaluated) {
    const sec = item.company.sector || 'Diversified';
    const existing = sectorMap.get(sec);
    if (!existing || item.score > existing.score) {
      sectorMap.set(sec, item);
    }
  }

  // Sort sectors by score descending
  const topSectorPicks = Array.from(sectorMap.values()).sort((a, b) => b.score - a.score);

  // We need 5 or more distinct sectors/companies
  const selected: (typeof evaluated)[0][] = [];
  const selectedIds = new Set<string>();

  for (const pick of topSectorPicks) {
    if (selected.length < 5) {
      selected.push(pick);
      selectedIds.add(pick.company._id.toString());
    }
  }

  if (selected.length < 5) {
    const remaining = evaluated
      .filter((e) => !selectedIds.has(e.company._id.toString()))
      .sort((a, b) => b.score - a.score);
    for (const r of remaining) {
      if (selected.length < 5) {
        selected.push(r);
        selectedIds.add(r.company._id.toString());
      }
    }
  }

  // Target allocation weights across 5 (or 6) companies: e.g. 25%, 20%, 20%, 20%, 15%
  const weights =
    selected.length >= 6
      ? [0.25, 0.20, 0.15, 0.15, 0.15, 0.10]
      : [0.25, 0.20, 0.20, 0.20, 0.15];

  let totalInvestedAmount = 0;
  const allocations: AllocatedStock[] = selected.map((item, idx) => {
    const weight = weights[idx] ?? (1 / (selected.length || 1));
    const allocatedAmount = Math.round(userBudget * weight);
    const sharesToBuy = Math.floor(allocatedAmount / item.sharePrice);
    const actualInvestedAmount = parseFloat((sharesToBuy * item.sharePrice).toFixed(2));
    const unallocatedCash = parseFloat((allocatedAmount - actualInvestedAmount).toFixed(2));
    totalInvestedAmount += actualInvestedAmount;

    const warImpact = evaluateWarAndGeopoliticalImpact(item.company, item.analysis);
    const roeVal = item.analysis.returnOnEquity.value ?? 15;
    const growthVal = item.analysis.profitability.revenueGrowthYoY ?? 10;
    const profitPercentage = parseFloat(Math.max(8, Math.min(32, roeVal * 0.85 + Math.max(0, growthVal) * 0.35)).toFixed(1));

    return {
      companyId: item.company._id.toString(),
      symbol: item.company.symbol,
      companyName: item.company.companyName,
      sector: item.company.sector,
      sharePrice: item.sharePrice,
      allocatedAmount,
      allocationPercentage: Math.round(weight * 100),
      sharesToBuy,
      actualInvestedAmount,
      unallocatedCash,
      financialStrengthScore: item.score,
      keyStrengths: item.strengths.slice(0, 3),
      isTopRecommendation: idx === 0,
      riskPercentage: warImpact.warRiskPercentage,
      riskLevel: warImpact.warRiskLevel,
      profitPercentage,
    };
  });

  const totalAllocatedAmount = allocations.reduce((acc, a) => acc + a.allocatedAmount, 0);
  const unallocatedCash = parseFloat((userBudget - totalInvestedAmount).toFixed(2));

  // 3. Top Recommendation & Booster:
  const topPick = allocations[0] || {
    companyId: '',
    symbol: 'NSE/BSE',
    companyName: 'Indian Equity Leader',
    sector: 'Diversified',
    sharePrice: 1000,
    allocatedAmount: Math.round(userBudget * 0.25),
    sharesToBuy: 1,
  };
  const topItem = selected[0];
  const topRoe = topItem?.analysis.returnOnEquity.value || 18;

  const rawExtra = Math.max(userBudget * 0.2, (topPick.sharePrice || 1000) * 2, 2000);
  const suggestedExtraAmount = Math.ceil(rawExtra / 500) * 500;
  const extraShares = Math.floor(suggestedExtraAmount / (topPick.sharePrice || 1));
  const newTotalAmount = topPick.allocatedAmount + suggestedExtraAmount;
  const newTotalShares = topPick.sharesToBuy + extraShares;

  const currentProjectedReturnPercentage = parseFloat(
    (12.5 + ((topItem?.score || 60) - 50) * 0.05).toFixed(1)
  );
  const returnBoost = parseFloat(Math.min(4.5, Math.max(1.5, (topRoe / 10) * 1.2)).toFixed(1));
  const boostedProjectedReturnPercentage = parseFloat(
    (currentProjectedReturnPercentage + returnBoost).toFixed(1)
  );

  const boosterRecommendation: BoosterRecommendation = {
    companyId: topPick.companyId,
    symbol: topPick.symbol,
    companyName: topPick.companyName,
    sector: topPick.sector,
    sharePrice: topPick.sharePrice,
    currentAllocatedAmount: topPick.allocatedAmount,
    currentShares: topPick.sharesToBuy,
    suggestedExtraAmount,
    newTotalAmount,
    newTotalShares,
    currentProjectedReturnPercentage,
    boostedProjectedReturnPercentage,
    projectedReturnIncreasePercentage: returnBoost,
    analysisRationale: `Adding an extra ₹${suggestedExtraAmount.toLocaleString('en-IN')} into ${topPick.companyName} unlocks +${extraShares} additional shares. Backed by ${topItem?.strengths[0] || 'superior fundamentals'} and disciplined capital allocation, the deterministic analysis indicates this booster allocation can increase your estimated projected return potential from ${currentProjectedReturnPercentage}% to ${boostedProjectedReturnPercentage}% (+${returnBoost}% return increase).`,
  };

  return {
    totalMonthlyBudget: userBudget,
    currency: 'INR',
    totalAllocatedAmount,
    totalInvestedAmount: parseFloat(totalInvestedAmount.toFixed(2)),
    unallocatedCash,
    sectorCount: new Set(allocations.map((a) => a.sector)).size,
    allocations,
    topRecommendation: boosterRecommendation,
  };
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
  const hasBudget = Boolean(profile?.monthlyInvestmentBudget && profile.monthlyInvestmentBudget > 0);
  if (!profile || (!profile.isCompleted && !hasBudget)) {
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

  const userBudget: number = (profile.monthlyInvestmentBudget && profile.monthlyInvestmentBudget > 0)
    ? profile.monthlyInvestmentBudget
    : 10000;

  // Fetch verified Indian companies from MongoDB
  const companies = await Company.find().sort({ marketCap: -1, companyName: 1 });

  // Generate personalized monthly allocation plan across 5+ stocks from different sectors
  const monthlyAllocationPlan = generateMonthlyAllocationPlan(companies, userBudget);

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

    const warImpact = evaluateWarAndGeopoliticalImpact(company, analysis);
    const roeVal = analysis.returnOnEquity.value ?? 14;
    const growthVal = analysis.profitability.revenueGrowthYoY ?? 8;
    const profitPercentage = parseFloat(Math.max(7, Math.min(35, roeVal * 0.85 + Math.max(0, growthVal) * 0.35)).toFixed(1));

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
      riskPercentage: warImpact.warRiskPercentage,
      riskLevel: warImpact.warRiskLevel,
      profitPercentage,
      dataSource: company.dataSource || 'Screener.in',
      reportingPeriod: analysis.reportingPeriod,
      lastUpdated: company.lastUpdated,
    };
  });

  return {
    monthlyInvestmentBudget: userBudget,
    currency: profile.currency || 'INR',
    profileCompleted: true,
    monthlyAllocationPlan,
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

  // Execute RAG pipeline for comprehensive analysis with resilient fallback
  let aiExplanation = '';
  let sources = [company.dataSource || 'Screener.in'];
  let reportingPeriods = [analysis.reportingPeriod || 'Latest'];

  try {
    const ragResult = await runCompanyRagPipeline({
      companyId: company._id.toString(),
      query: `Provide a detailed financial analysis of ${company.companyName} (${company.symbol}). Explain its cash flow generation, return on equity, balance sheet leverage, and major business risks in clear, simple terms for an individual investor.`,
    });
    aiExplanation = ragResult.answer;
    sources = ragResult.sources;
    reportingPeriods = ragResult.reportingPeriods;
  } catch {
    aiExplanation = `Comprehensive Financial Analysis for ${company.companyName} (${company.symbol}):\n\n• Capital Efficiency: Return on Equity (ROE) is verified at ${analysis.returnOnEquity.value !== null ? analysis.returnOnEquity.value + '%' : 'N/A'}, demonstrating ${analysis.returnOnEquity.value && analysis.returnOnEquity.value >= 15 ? 'superior' : 'moderate'} shareholder value generation.\n• Free Cash Flow: Organic cash generation stands at ₹${analysis.freeCashFlow.value !== null ? analysis.freeCashFlow.value.toLocaleString('en-IN') + ' Cr' : 'N/A'}, supporting sustainable business reinvestment.\n• Leverage & Solvency: Balance sheet Debt-to-Equity is ${analysis.debtToEquity.value !== null ? analysis.debtToEquity.value : 'N/A'}, reflecting ${analysis.debtToEquity.value && analysis.debtToEquity.value <= 0.5 ? 'a conservative capital structure' : 'moderate leverage'}.\n• Primary Risk Focus: ${risks.slice(0, 2).join(' ')}`;
  }

  return {
    company: {
      id: company._id.toString(),
      symbol: company.symbol,
      companyName: company.companyName,
      sector: company.sector,
      sharePrice: company.sharePrice,
      marketCap: company.marketCap,
    },
    financialMetrics: analysis,
    aiExplanation,
    financialRisks: risks,
    budgetSuitability,
    sources,
    reportingPeriods,
    lastUpdated: company.lastUpdated,
  };
};

export {
  getPersonalizedDashboard,
  getPersonalizedCompanyAnalysis,
  deriveFinancialRisks,
};
