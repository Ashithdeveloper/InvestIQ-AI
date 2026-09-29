export interface StockMetricsInput {
  symbol?: string;
  sector?: string;
  sharePrice?: number | null;
  riskPercentage?: number;
  riskLevel?: string;
  profitPercentage?: number;
  financialMetrics?: {
    roe?: number | null;
    revenue?: number | null;
    netProfit?: number | null;
  };
  returnOnEquity?: { value?: number | null };
  profitability?: {
    revenueGrowthYoY?: number | null;
    netProfitMargin?: number | null;
  };
}

export interface StockRiskAndProfit {
  riskPercentage: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  profitPercentage: number;
}

export const getStockRiskAndProfit = (company: StockMetricsInput): StockRiskAndProfit => {
  // If provided directly by backend
  if (
    company.riskPercentage !== undefined &&
    company.riskPercentage !== null &&
    company.profitPercentage !== undefined &&
    company.profitPercentage !== null
  ) {
    const rawLevel = company.riskLevel?.toUpperCase();
    const riskLevel: 'LOW' | 'MODERATE' | 'HIGH' =
      rawLevel === 'LOW' || rawLevel === 'MODERATE' || rawLevel === 'HIGH'
        ? rawLevel
        : company.riskPercentage <= 25
        ? 'LOW'
        : company.riskPercentage <= 60
        ? 'MODERATE'
        : 'HIGH';

    return {
      riskPercentage: company.riskPercentage,
      riskLevel,
      profitPercentage: company.profitPercentage,
    };
  }

  // Sector-calibrated war & geopolitical risk baseline (aligned with buySellAnalysis.service.ts)
  const sector = (company.sector || '').toLowerCase();
  let riskPercentage = 48;
  let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'MODERATE';

  if (sector.includes('defense') || sector.includes('aerospace')) {
    riskPercentage = 16;
    riskLevel = 'LOW';
  } else if (
    sector.includes('it') ||
    sector.includes('software') ||
    sector.includes('technology') ||
    sector.includes('tech')
  ) {
    riskPercentage = 32;
    riskLevel = 'LOW';
  } else if (sector.includes('pharma') || sector.includes('healthcare') || sector.includes('hospital')) {
    riskPercentage = 24;
    riskLevel = 'LOW';
  } else if (sector.includes('oil') || sector.includes('energy') || sector.includes('refin')) {
    riskPercentage = 38;
    riskLevel = 'MODERATE';
  } else if (sector.includes('metal') || sector.includes('steel') || sector.includes('mining')) {
    riskPercentage = 44;
    riskLevel = 'MODERATE';
  } else if (sector.includes('fmcg') || sector.includes('consumer')) {
    riskPercentage = 46;
    riskLevel = 'MODERATE';
  } else if (sector.includes('bank') || sector.includes('finance') || sector.includes('financial')) {
    riskPercentage = 58;
    riskLevel = 'MODERATE';
  } else if (sector.includes('auto') || sector.includes('motor') || sector.includes('vehicle')) {
    riskPercentage = 76;
    riskLevel = 'HIGH';
  }

  const roe = company.financialMetrics?.roe ?? company.returnOnEquity?.value ?? 15;
  const growth = company.profitability?.revenueGrowthYoY ?? 10;
  const profitPercentage = parseFloat(
    Math.max(8.5, Math.min(34.0, (roe || 15) * 0.85 + Math.max(0, growth || 0) * 0.35)).toFixed(1)
  );

  return { riskPercentage, riskLevel, profitPercentage };
};
