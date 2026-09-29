// ============================================================================
// INVESTIQ-AI: AI BUY & SELL ANALYSIS SERVICE
// ============================================================================
// Generates balanced financial analysis using RAG + deterministic metrics.
// Does NOT provide guaranteed buy/sell recommendations.
// ============================================================================

import { getCompanyById } from './company.service';
import { calculateFinancialMetrics } from './analysis.service';
import { deriveFinancialRisks } from './dashboard.service';
import { runCompanyRagPipeline } from './rag';
import User from '../models/User.model';

export interface BuySellAnalysisResult {
  analysisType: 'buy' | 'sell';
  company: {
    id: string;
    symbol: string;
    companyName: string;
    sector: string;
    currentSharePrice: number | null;
    marketCap: number | null;
    high52Week: number | null;
    low52Week: number | null;
    dataSource: string;
    lastUpdated: Date;
  };
  financialStrengths: string[];
  financialRisks: string[];
  valuationSummary: {
    peRatio: number | null;
    pbRatio: number | null;
    evToEbitda: number | null;
    reportingPeriod: string | null;
  };
  profitabilitySummary: {
    revenueGrowthYoY: number | null;
    netProfitMargin: number | null;
    operatingProfitMargin: number | null;
    reportingPeriod: string | null;
  };
  keyMetrics: {
    freeCashFlow: { value: number | null; period: string | null };
    returnOnEquity: { value: number | null; period: string | null };
    debtToEquity: { value: number | null; period: string | null };
  };
  aiAnalysis: string;
  budgetContext: {
    monthlyBudget: number | null;
    purchasableShares: number | null;
    note: string | null;
  } | null;
  hypotheticalProfitLoss: {
    purchasePrice: number;
    currentPrice: number;
    shares: number;
    investedAmount: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercent: number;
  } | null;
  sources: string[];
  reportingPeriods: string[];
  disclaimer: string;
}

const BUY_DISCLAIMER =
  'This is an informational financial analysis for educational purposes only. It is NOT a recommendation, guarantee, or advice to buy any security. All investment decisions carry risk. Consult a SEBI-registered financial advisor before making investment decisions.';

const SELL_DISCLAIMER =
  'This is an informational financial analysis for educational purposes only. It is NOT a recommendation, guarantee, or advice to sell any security. Past performance does not predict future results. Consult a SEBI-registered financial advisor before making investment decisions.';

const generateBuyAnalysis = async (options: {
  companyId: string;
  userId?: string;
}): Promise<BuySellAnalysisResult> => {
  const { companyId, userId } = options;
  const company = await getCompanyById(companyId);
  const analysis = calculateFinancialMetrics(company);
  const risks = deriveFinancialRisks(company, analysis);

  // Derive financial strengths from metrics
  const strengths: string[] = [];
  if (analysis.returnOnEquity.value !== null && analysis.returnOnEquity.value > 15) {
    strengths.push(`Strong Return on Equity of ${analysis.returnOnEquity.value}%, indicating efficient capital utilization.`);
  }
  if (analysis.freeCashFlow.value !== null && analysis.freeCashFlow.value > 0) {
    strengths.push(`Positive Free Cash Flow of ₹${analysis.freeCashFlow.value.toLocaleString('en-IN')} Cr, reflecting strong cash generation.`);
  }
  if (analysis.profitability.revenueGrowthYoY !== null && analysis.profitability.revenueGrowthYoY > 10) {
    strengths.push(`Revenue grew ${analysis.profitability.revenueGrowthYoY}% YoY, showing business momentum.`);
  }
  if (analysis.profitability.netProfitMargin !== null && analysis.profitability.netProfitMargin > 10) {
    strengths.push(`Healthy net profit margin of ${analysis.profitability.netProfitMargin}%.`);
  }
  if (analysis.debtToEquity.value !== null && analysis.debtToEquity.value < 0.5) {
    strengths.push(`Low leverage with Debt-to-Equity of ${analysis.debtToEquity.value}, indicating conservative capital structure.`);
  }
  if (company.high52Week && company.sharePrice && company.low52Week) {
    const range = company.high52Week - company.low52Week;
    if (range > 0) {
      const positionPct = ((company.sharePrice - company.low52Week) / range * 100).toFixed(0);
      strengths.push(`Currently trading at ${positionPct}% of its 52-week range (₹${company.low52Week} - ₹${company.high52Week}).`);
    }
  }
  if (strengths.length === 0) {
    strengths.push('Verified financial data is limited. Please review available metrics carefully before any investment decision.');
  }

  // Run RAG pipeline
  const ragResult = await runCompanyRagPipeline({
    companyId,
    query: `Provide a balanced buy-side financial analysis for ${company.companyName} (${company.symbol}). Analyze its valuation ratios, profitability, debt levels, cash flow, and historical performance. Identify both strengths and potential risks. Do not guarantee any returns or recommend purchasing. Use only verified data provided.`,
  });

  // Budget context if user is authenticated
  let budgetContext: BuySellAnalysisResult['budgetContext'] = null;
  if (userId) {
    const user = await User.findById(userId);
    if (user?.financialProfile?.monthlyInvestmentBudget && company.sharePrice) {
      const budget = user.financialProfile.monthlyInvestmentBudget;
      const shares = Math.floor(budget / company.sharePrice);
      budgetContext = {
        monthlyBudget: budget,
        purchasableShares: shares,
        note: shares > 0
          ? `With your monthly budget of ₹${budget.toLocaleString('en-IN')}, you could purchase ${shares} whole share(s) at ₹${company.sharePrice} each.`
          : `A single share of ${company.symbol} at ₹${company.sharePrice} exceeds your monthly budget of ₹${budget.toLocaleString('en-IN')}.`,
      };
    }
  }

  return {
    analysisType: 'buy',
    company: {
      id: company._id.toString(),
      symbol: company.symbol,
      companyName: company.companyName,
      sector: company.sector,
      currentSharePrice: company.sharePrice,
      marketCap: company.marketCap,
      high52Week: company.high52Week,
      low52Week: company.low52Week,
      dataSource: company.dataSource || 'Screener.in',
      lastUpdated: company.lastUpdated,
    },
    financialStrengths: strengths,
    financialRisks: risks,
    valuationSummary: analysis.valuation,
    profitabilitySummary: analysis.profitability,
    keyMetrics: {
      freeCashFlow: { value: analysis.freeCashFlow.value, period: analysis.freeCashFlow.reportingPeriod },
      returnOnEquity: { value: analysis.returnOnEquity.value, period: analysis.returnOnEquity.reportingPeriod },
      debtToEquity: { value: analysis.debtToEquity.value, period: analysis.debtToEquity.reportingPeriod },
    },
    aiAnalysis: ragResult.answer,
    budgetContext,
    hypotheticalProfitLoss: null,
    sources: ragResult.sources,
    reportingPeriods: ragResult.reportingPeriods,
    disclaimer: BUY_DISCLAIMER,
  };
};

const generateSellAnalysis = async (options: {
  companyId: string;
  userId?: string;
  purchasePrice?: number;
  sharesHeld?: number;
}): Promise<BuySellAnalysisResult> => {
  const { companyId, userId, purchasePrice, sharesHeld } = options;
  const company = await getCompanyById(companyId);
  const analysis = calculateFinancialMetrics(company);
  const risks = deriveFinancialRisks(company, analysis);

  // Derive sell-side observations
  const sellConcerns: string[] = [];
  if (analysis.profitability.revenueGrowthYoY !== null && analysis.profitability.revenueGrowthYoY < 0) {
    sellConcerns.push(`Revenue declined ${Math.abs(analysis.profitability.revenueGrowthYoY)}% YoY, indicating potential contraction.`);
  }
  if (analysis.debtToEquity.value !== null && analysis.debtToEquity.value > 2) {
    sellConcerns.push(`Debt-to-Equity of ${analysis.debtToEquity.value} suggests high leverage risk.`);
  }
  if (analysis.freeCashFlow.value !== null && analysis.freeCashFlow.value < 0) {
    sellConcerns.push(`Negative Free Cash Flow of ₹${analysis.freeCashFlow.value.toLocaleString('en-IN')} Cr suggests cash burn.`);
  }
  if (analysis.valuation.peRatio !== null && analysis.valuation.peRatio > 80) {
    sellConcerns.push(`Very high P/E of ${analysis.valuation.peRatio} may indicate overvaluation.`);
  }

  // Financial strengths (reasons to hold)
  const strengths: string[] = [];
  if (analysis.returnOnEquity.value !== null && analysis.returnOnEquity.value > 15) {
    strengths.push(`ROE of ${analysis.returnOnEquity.value}% suggests strong capital efficiency — consider holding.`);
  }
  if (analysis.profitability.revenueGrowthYoY !== null && analysis.profitability.revenueGrowthYoY > 10) {
    strengths.push(`Revenue growth of ${analysis.profitability.revenueGrowthYoY}% may favor longer holding periods.`);
  }
  if (analysis.freeCashFlow.value !== null && analysis.freeCashFlow.value > 0) {
    strengths.push(`Positive cash flow generation of ₹${analysis.freeCashFlow.value.toLocaleString('en-IN')} Cr.`);
  }
  if (strengths.length === 0) {
    strengths.push('Insufficient verified data to identify strong holding arguments. Review fundamentals carefully.');
  }

  // Run RAG pipeline for sell analysis
  const ragResult = await runCompanyRagPipeline({
    companyId,
    query: `Provide a balanced sell-side financial analysis for ${company.companyName} (${company.symbol}). Analyze deteriorating metrics, valuation risks, debt changes, and cash flow concerns. Also note any reasons to continue holding. Use only verified data provided. Do not guarantee outcomes.`,
  });

  // Hypothetical P&L if purchase price provided
  let hypotheticalProfitLoss: BuySellAnalysisResult['hypotheticalProfitLoss'] = null;
  if (purchasePrice && purchasePrice > 0 && company.sharePrice) {
    const shares = sharesHeld && sharesHeld > 0 ? sharesHeld : 1;
    const investedAmount = parseFloat((purchasePrice * shares).toFixed(2));
    const currentValue = parseFloat((company.sharePrice * shares).toFixed(2));
    const profitLoss = parseFloat((currentValue - investedAmount).toFixed(2));
    const profitLossPercent = investedAmount > 0
      ? parseFloat(((profitLoss / investedAmount) * 100).toFixed(2))
      : 0;

    hypotheticalProfitLoss = {
      purchasePrice,
      currentPrice: company.sharePrice,
      shares,
      investedAmount,
      currentValue,
      profitLoss,
      profitLossPercent,
    };
  }

  // Budget context
  let budgetContext: BuySellAnalysisResult['budgetContext'] = null;
  if (userId) {
    const user = await User.findById(userId);
    if (user?.financialProfile?.monthlyInvestmentBudget && company.sharePrice) {
      const budget = user.financialProfile.monthlyInvestmentBudget;
      budgetContext = {
        monthlyBudget: budget,
        purchasableShares: Math.floor(budget / company.sharePrice),
        note: null,
      };
    }
  }

  return {
    analysisType: 'sell',
    company: {
      id: company._id.toString(),
      symbol: company.symbol,
      companyName: company.companyName,
      sector: company.sector,
      currentSharePrice: company.sharePrice,
      marketCap: company.marketCap,
      high52Week: company.high52Week,
      low52Week: company.low52Week,
      dataSource: company.dataSource || 'Screener.in',
      lastUpdated: company.lastUpdated,
    },
    financialStrengths: strengths,
    financialRisks: [...sellConcerns, ...risks],
    valuationSummary: analysis.valuation,
    profitabilitySummary: analysis.profitability,
    keyMetrics: {
      freeCashFlow: { value: analysis.freeCashFlow.value, period: analysis.freeCashFlow.reportingPeriod },
      returnOnEquity: { value: analysis.returnOnEquity.value, period: analysis.returnOnEquity.reportingPeriod },
      debtToEquity: { value: analysis.debtToEquity.value, period: analysis.debtToEquity.reportingPeriod },
    },
    aiAnalysis: ragResult.answer,
    budgetContext,
    hypotheticalProfitLoss,
    sources: ragResult.sources,
    reportingPeriods: ragResult.reportingPeriods,
    disclaimer: SELL_DISCLAIMER,
  };
};

export { generateBuyAnalysis, generateSellAnalysis };
