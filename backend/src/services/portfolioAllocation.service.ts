import { ICompany } from '../models/Company.model';
import { calculateFinancialMetrics } from './analysis.service';
import { evaluateWarAndGeopoliticalImpact } from './buySellAnalysis.service';

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

export const generateMonthlyAllocationPlan = (
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
    const profitPercentage = parseFloat(
      Math.max(8, Math.min(32, roeVal * 0.85 + Math.max(0, growthVal) * 0.35)).toFixed(1)
    );

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
