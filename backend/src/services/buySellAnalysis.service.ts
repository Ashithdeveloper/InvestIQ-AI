// ============================================================================
// INVESTIQ-AI: AI BUY & SELL ANALYSIS SERVICE
// ============================================================================
// Generates balanced financial analysis using RAG + deterministic metrics.
// Does NOT provide guaranteed buy/sell recommendations or return promises.
// ============================================================================

import { getCompanyById } from './company.service';
import { calculateFinancialMetrics } from './analysis.service';
import { deriveFinancialRisks } from './dashboard.service';
import { runCompanyRagPipeline } from './rag';
import User from '../models/User.model';

export interface BuyAnalysisResult {
  companyName: string;
  stockSymbol: string;
  latestAvailablePrice: number | null;
  dataTimestamp: Date;
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
  hypotheticalScenarios: Array<{
    scenarioName: string;
    assumedChangePercent: number;
    projectedPrice: number;
    purchasableShares: number;
    investedCapital: number;
    unallocatedCash: number;
    projectedValue: number;
    projectedProfitLoss: number;
  }> | null;
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

export interface SellAnalysisResult {
  companyName: string;
  stockSymbol: string;
  latestAvailablePrice: number | null;
  dataTimestamp: Date;
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
  hypotheticalProfitLoss: {
    purchasePrice: number;
    currentPrice: number;
    quantityHeld: number;
    investedAmount: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercent: number;
    status: 'PROFIT' | 'LOSS' | 'BREAKEVEN';
  } | null;
  sourceInformation: string[];
  aiGeneratedExplanation: string;
  disclaimer: string;
}

const BUY_DISCLAIMER =
  'This is an informational financial analysis generated for educational and research purposes only. It is NOT a recommendation, guarantee, or investment advice to buy any security. All stock market investments carry capital risk. Consult a SEBI-registered financial advisor before making investment decisions.';

const SELL_DISCLAIMER =
  'This is an informational financial analysis generated for educational and research purposes only. It is NOT a recommendation, guarantee, or instruction to sell or divest any security. Past performance does not guarantee future results. Consult a SEBI-registered financial advisor before making investment decisions.';

// ── Buy Analysis Logic ──────────────────────────────────────────────────
const generateBuyAnalysis = async (options: {
  companyId: string;
  userId?: string;
  investmentAmount?: number;
  investmentDuration?: string | number;
}): Promise<BuyAnalysisResult> => {
  const { companyId, userId, investmentAmount, investmentDuration } = options;
  const company = await getCompanyById(companyId);
  const analysis = calculateFinancialMetrics(company);
  const risks = deriveFinancialRisks(company, analysis);

  // 1. Identify Financial Strengths
  const strengths: string[] = [];
  if (analysis.returnOnEquity.value !== null && analysis.returnOnEquity.value > 15) {
    strengths.push(
      `Strong Return on Equity (ROE) of ${analysis.returnOnEquity.value}%, indicating high capital efficiency.`
    );
  }
  if (analysis.freeCashFlow.value !== null && analysis.freeCashFlow.value > 0) {
    strengths.push(
      `Positive Free Cash Flow of ₹${analysis.freeCashFlow.value.toLocaleString('en-IN')} Cr, supporting self-funded growth.`
    );
  }
  if (analysis.profitability.revenueGrowthYoY !== null && analysis.profitability.revenueGrowthYoY > 10) {
    strengths.push(
      `Revenue grew ${analysis.profitability.revenueGrowthYoY}% YoY, demonstrating strong top-line momentum.`
    );
  }
  if (analysis.profitability.netProfitMargin !== null && analysis.profitability.netProfitMargin > 10) {
    strengths.push(
      `Healthy Net Profit Margin of ${analysis.profitability.netProfitMargin}%, reflecting pricing power.`
    );
  }
  if (analysis.debtToEquity.value !== null && analysis.debtToEquity.value < 0.5) {
    strengths.push(
      `Low Debt-to-Equity ratio of ${analysis.debtToEquity.value}, indicating minimal balance sheet leverage.`
    );
  }
  if (company.high52Week && company.sharePrice && company.low52Week) {
    const range = company.high52Week - company.low52Week;
    if (range > 0) {
      const positionPct = Math.round(((company.sharePrice - company.low52Week) / range) * 100);
      strengths.push(
        `Currently trading at ${positionPct}% of its 52-week range (Low: ₹${company.low52Week} - High: ₹${company.high52Week}).`
      );
    }
  }
  if (strengths.length === 0) {
    strengths.push(
      'Verified financial data is limited. Fundamental metrics should be closely examined before committing capital.'
    );
  }

  // 2. 52-Week Range Calculation
  let currentRangePositionPercent: number | null = null;
  if (company.high52Week && company.low52Week && company.sharePrice) {
    const range = company.high52Week - company.low52Week;
    if (range > 0) {
      currentRangePositionPercent = parseFloat(
        (((company.sharePrice - company.low52Week) / range) * 100).toFixed(1)
      );
    }
  }

  // 3. User Budget Context (if authenticated)
  let budgetContext: BuyAnalysisResult['budgetContext'] = null;
  let userBudget = investmentAmount;

  if (userId) {
    const user = await User.findById(userId);
    if (user?.financialProfile?.monthlyInvestmentBudget) {
      const profileBudget = user.financialProfile.monthlyInvestmentBudget;
      if (!userBudget) {
        userBudget = profileBudget;
      }
      if (company.sharePrice) {
        const shares = Math.floor(profileBudget / company.sharePrice);
        budgetContext = {
          monthlyBudget: profileBudget,
          purchasableShares: shares,
          note:
            shares > 0
              ? `Your monthly investment budget of ₹${profileBudget.toLocaleString('en-IN')} permits purchasing ${shares} whole share(s) at current price ₹${company.sharePrice}.`
              : `A single share of ${company.symbol} (₹${company.sharePrice}) exceeds your monthly budget of ₹${profileBudget.toLocaleString('en-IN')}.`,
        };
      }
    }
  }

  // 4. Hypothetical Investment Scenarios (if investment amount provided)
  let hypotheticalScenarios: BuyAnalysisResult['hypotheticalScenarios'] = null;
  if (userBudget && userBudget > 0 && company.sharePrice && company.sharePrice > 0) {
    const sharePrice = company.sharePrice;
    const wholeShares = Math.floor(userBudget / sharePrice);
    const allocatedCapital = parseFloat((wholeShares * sharePrice).toFixed(2));
    const unallocatedCash = parseFloat((userBudget - allocatedCapital).toFixed(2));

    const movements = [
      { name: 'Moderate Growth (+10%)', pct: 10 },
      { name: 'Strong Growth (+25%)', pct: 25 },
      { name: 'Moderate Correction (-10%)', pct: -10 },
      { name: 'Market Downturn (-25%)', pct: -25 },
    ];

    hypotheticalScenarios = movements.map((m) => {
      const projectedPrice = parseFloat((sharePrice * (1 + m.pct / 100)).toFixed(2));
      const projectedValue = parseFloat((wholeShares * projectedPrice + unallocatedCash).toFixed(2));
      const projectedProfitLoss = parseFloat((projectedValue - userBudget!).toFixed(2));

      return {
        scenarioName: m.name,
        assumedChangePercent: m.pct,
        projectedPrice,
        purchasableShares: wholeShares,
        investedCapital: allocatedCapital,
        unallocatedCash,
        projectedValue,
        projectedProfitLoss,
      };
    });
  }

  // 5. Query RAG Context & LLM Explanation
  const durationText = investmentDuration ? ` with an intended horizon of ${investmentDuration}` : '';
  const ragResult = await runCompanyRagPipeline({
    companyId: company._id.toString(),
    query: `Provide an objective buy-side financial evaluation for ${company.companyName} (${company.symbol})${durationText}. Analyze its valuation multiples (P/E: ${analysis.valuation.peRatio ?? 'N/A'}, P/B: ${analysis.valuation.pbRatio ?? 'N/A'}), profitability trends (Net Margin: ${analysis.profitability.netProfitMargin ?? 'N/A'}%), balance sheet strength (Debt/Equity: ${analysis.debtToEquity.value ?? 'N/A'}), and cash flow stability (FCF: ₹${analysis.freeCashFlow.value ?? 'N/A'} Cr). Identify both fundamental catalysts and downside risks. Do not provide buy guarantees or return assurances. Use verified financial data strictly.`,
  });

  return {
    companyName: company.companyName,
    stockSymbol: company.symbol,
    latestAvailablePrice: company.sharePrice,
    dataTimestamp: company.lastUpdated || new Date(),
    financialStrengths: strengths,
    profitabilityAnalysis: analysis.profitability,
    valuationAnalysis: analysis.valuation,
    historicalPerformance: {
      high52Week: company.high52Week,
      low52Week: company.low52Week,
      currentRangePositionPercent,
    },
    financialRisks: risks,
    hypotheticalScenarios,
    budgetContext,
    keyAssumptions: [
      'Analysis based on latest verified quarterly and annual filings from Screener.in.',
      'Only whole-share transactions on NSE/BSE without fractional purchases.',
      'Excludes brokerage commissions, STT, exchange charges, and applicable capital gains taxes.',
      'Assumes business fundamentals remain stable over the evaluation timeframe.',
    ],
    dataSources: ragResult.sources.length > 0 ? ragResult.sources : ['Screener.in consolidated financial filings'],
    aiGeneratedExplanation: ragResult.answer,
    disclaimer: BUY_DISCLAIMER,
  };
};

// ── Sell Analysis Logic ─────────────────────────────────────────────────
const generateSellAnalysis = async (options: {
  companyId: string;
  userId?: string;
  purchasePrice?: number;
  quantityHeld?: number;
}): Promise<SellAnalysisResult> => {
  const { companyId, purchasePrice, quantityHeld } = options;
  const company = await getCompanyById(companyId);
  const analysis = calculateFinancialMetrics(company);
  const risks = deriveFinancialRisks(company, analysis);

  // 1. Performance Changes & Sell Observations
  const performanceChanges: string[] = [];
  if (analysis.profitability.revenueGrowthYoY !== null) {
    if (analysis.profitability.revenueGrowthYoY < 0) {
      performanceChanges.push(
        `Revenue contracted by ${Math.abs(analysis.profitability.revenueGrowthYoY)}% YoY, signaling business slowdown.`
      );
    } else {
      performanceChanges.push(
        `Revenue expanded by ${analysis.profitability.revenueGrowthYoY}% YoY.`
      );
    }
  }
  if (analysis.profitability.netProfitMargin !== null) {
    if (analysis.profitability.netProfitMargin < 5) {
      performanceChanges.push(
        `Low net profit margin of ${analysis.profitability.netProfitMargin}%, making bottom-line vulnerable to cost pressures.`
      );
    }
  }

  // 2. Cash Flow Analysis
  let cashFlowStatus = 'Neutral / Unavailable';
  if (analysis.freeCashFlow.value !== null) {
    if (analysis.freeCashFlow.value > 0) {
      cashFlowStatus = `Positive free cash flow generation of ₹${analysis.freeCashFlow.value.toLocaleString('en-IN')} Cr.`;
    } else if (analysis.freeCashFlow.value < 0) {
      cashFlowStatus = `Negative free cash flow (₹${analysis.freeCashFlow.value.toLocaleString('en-IN')} Cr), indicating cash consumption.`;
    } else {
      cashFlowStatus = 'Free cash flow is breakeven (₹0 Cr).';
    }
  }

  // 3. Debt Analysis
  let leverageRisk = 'Low / Conservative';
  if (analysis.debtToEquity.value !== null) {
    if (analysis.debtToEquity.value > 2.0) {
      leverageRisk = `High leverage warning (Debt/Equity: ${analysis.debtToEquity.value}). High interest coverage vulnerability.`;
    } else if (analysis.debtToEquity.value > 1.0) {
      leverageRisk = `Moderate leverage (Debt/Equity: ${analysis.debtToEquity.value}).`;
    } else {
      leverageRisk = `Healthy low leverage (Debt/Equity: ${analysis.debtToEquity.value}).`;
    }
  }

  // 4. Valuation Considerations
  let valuationEvaluation = 'In line with historical parameters';
  if (analysis.valuation.peRatio !== null) {
    if (analysis.valuation.peRatio > 75) {
      valuationEvaluation = `Elevated P/E ratio (${analysis.valuation.peRatio}), pricing in high forward expectations.`;
    } else if (analysis.valuation.peRatio < 15 && analysis.valuation.peRatio > 0) {
      valuationEvaluation = `Low P/E ratio (${analysis.valuation.peRatio}), potential value or cyclical discount.`;
    }
  }

  // 5. Reasons to Hold (Counterbalance)
  const reasonsToHold: string[] = [];
  if (analysis.returnOnEquity.value !== null && analysis.returnOnEquity.value > 15) {
    reasonsToHold.push(
      `Strong Return on Equity of ${analysis.returnOnEquity.value}% demonstrates ongoing capital efficiency.`
    );
  }
  if (analysis.profitability.revenueGrowthYoY !== null && analysis.profitability.revenueGrowthYoY > 12) {
    reasonsToHold.push(
      `Double-digit revenue growth (${analysis.profitability.revenueGrowthYoY}% YoY) supports long-term compounding.`
    );
  }
  if (analysis.freeCashFlow.value !== null && analysis.freeCashFlow.value > 0) {
    reasonsToHold.push(
      `Consistent cash generation of ₹${analysis.freeCashFlow.value.toLocaleString('en-IN')} Cr.`
    );
  }
  if (reasonsToHold.length === 0) {
    reasonsToHold.push(
      'Limited fundamental catalysts identified from verified filings. Monitor next quarterly results.'
    );
  }

  // 6. 52-Week Range Position
  let currentPositionPercent: number | null = null;
  if (company.high52Week && company.low52Week && company.sharePrice) {
    const range = company.high52Week - company.low52Week;
    if (range > 0) {
      currentPositionPercent = parseFloat(
        (((company.sharePrice - company.low52Week) / range) * 100).toFixed(1)
      );
    }
  }

  // 7. Hypothetical P&L Calculation (if purchase details provided)
  let hypotheticalProfitLoss: SellAnalysisResult['hypotheticalProfitLoss'] = null;
  if (purchasePrice && purchasePrice > 0 && company.sharePrice) {
    const quantity = quantityHeld && quantityHeld > 0 ? quantityHeld : 1;
    const investedAmount = parseFloat((purchasePrice * quantity).toFixed(2));
    const currentValue = parseFloat((company.sharePrice * quantity).toFixed(2));
    const profitLoss = parseFloat((currentValue - investedAmount).toFixed(2));
    const profitLossPercent = investedAmount > 0
      ? parseFloat(((profitLoss / investedAmount) * 100).toFixed(2))
      : 0;

    let status: 'PROFIT' | 'LOSS' | 'BREAKEVEN' = 'BREAKEVEN';
    if (profitLoss > 0) status = 'PROFIT';
    else if (profitLoss < 0) status = 'LOSS';

    hypotheticalProfitLoss = {
      purchasePrice,
      currentPrice: company.sharePrice,
      quantityHeld: quantity,
      investedAmount,
      currentValue,
      profitLoss,
      profitLossPercent,
      status,
    };
  }

  // 8. RAG Analysis for Sell Considerations
  const ragResult = await runCompanyRagPipeline({
    companyId: company._id.toString(),
    query: `Provide a balanced sell-side financial assessment for ${company.companyName} (${company.symbol}). Analyze potential signs of deteriorating fundamentals, margin compression, excessive leverage (Debt/Equity: ${analysis.debtToEquity.value ?? 'N/A'}), valuation expansion risks (P/E: ${analysis.valuation.peRatio ?? 'N/A'}), and cash flow strain. Also detail the counter-arguments to maintain a hold position. Base explanation strictly on verified financial metrics. Do not provide direct sell instructions.`,
  });

  return {
    companyName: company.companyName,
    stockSymbol: company.symbol,
    latestAvailablePrice: company.sharePrice,
    dataTimestamp: company.lastUpdated || new Date(),
    financialPerformanceChanges: performanceChanges,
    profitabilityChanges: analysis.profitability,
    cashFlowAnalysis: {
      freeCashFlow: analysis.freeCashFlow.value,
      reportingPeriod: analysis.freeCashFlow.reportingPeriod,
      status: cashFlowStatus,
    },
    debtAnalysis: {
      debtToEquity: analysis.debtToEquity.value,
      reportingPeriod: analysis.debtToEquity.reportingPeriod,
      leverageRisk,
    },
    valuationConsiderations: {
      peRatio: analysis.valuation.peRatio,
      pbRatio: analysis.valuation.pbRatio,
      evaluation: valuationEvaluation,
    },
    historicalPriceMovement: {
      high52Week: company.high52Week,
      low52Week: company.low52Week,
      currentPositionPercent,
    },
    potentialFinancialRisks: risks,
    reasonsToHold,
    hypotheticalProfitLoss,
    sourceInformation: ragResult.sources.length > 0 ? ragResult.sources : ['Screener.in consolidated financial filings'],
    aiGeneratedExplanation: ragResult.answer,
    disclaimer: SELL_DISCLAIMER,
  };
};

export { generateBuyAnalysis, generateSellAnalysis };
