// ============================================================================
// INVESTIQ-AI: AI BUY & SELL ANALYSIS SERVICE
// ============================================================================
// Generates balanced financial analysis using RAG + deterministic metrics.
// Does NOT provide guaranteed buy/sell recommendations or return promises.
// ============================================================================

import { getCompanyById } from './company.service';
import { calculateFinancialMetrics, IFinancialAnalysis } from './analysis.service';
import { deriveFinancialRisks } from './dashboard.service';
import { runCompanyRagPipeline } from './rag';
import { ICompany } from '../models/Company.model';
import User from '../models/User.model';

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
  geopoliticalWarImpact: GeopoliticalWarImpact;
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

export const evaluateWarAndGeopoliticalImpact = (
  company: ICompany,
  _analysis: IFinancialAnalysis
): GeopoliticalWarImpact => {
  const sector = (company.sector || '').toLowerCase();
  const name = company.companyName.toLowerCase();
  const symbol = (company.symbol || '').toUpperCase();

  // 1. Energy, Oil & Gas, Refining, Petrochemicals (e.g. RELIANCE, ONGC, BPCL, IOC)
  if (
    sector.includes('energy') ||
    sector.includes('oil') ||
    sector.includes('petro') ||
    sector.includes('refin') ||
    name.includes('petroleum') ||
    symbol === 'RELIANCE' ||
    symbol === 'ONGC' ||
    symbol === 'BPCL' ||
    symbol === 'IOC'
  ) {
    return {
      warRiskPercentage: 38,
      warRiskLevel: 'MODERATE',
      primaryRiskReason: 'Crude spread volatility and potential SAED windfall tax risk offset by robust USD petroleum export realizations and complex refining margin gains.',
      warRiskFactors: [
        {
          factor: 'Crude Spread & Refining Margins',
          weightPercentage: 28,
          direction: 'RISK_INCREASE',
          reason: 'Global Brent crude surges expand Gross Refining Margins (GRMs), but elevate raw naphtha costs for petrochemical polymers.',
        },
        {
          factor: 'USD Currency Inflow Natural Hedge',
          weightPercentage: 22,
          direction: 'HEDGE_BUFFER',
          reason: 'Over 45% of petroleum revenues are USD-denominated, which shields earnings and provides forex gains when the Rupee depreciates.',
        },
        {
          factor: 'Maritime Freight & Choke-Point Surcharges',
          weightPercentage: 18,
          direction: 'RISK_INCREASE',
          reason: 'Tanker reroutings around Cape of Good Hope and war risk insurance surcharges across Persian Gulf/Red Sea elevate transport costs.',
        },
        {
          factor: 'Government SAED Windfall Tax Policy',
          weightPercentage: 14,
          direction: 'RISK_INCREASE',
          reason: 'Ministry of Finance may levy Special Additional Excise Duty (SAED) on crude export margins during prolonged wartime price rallies.',
        },
      ],
      sectorSensitivity: 'HIGH',
      vulnerabilityLevel: 'BENEFICIARY',
      summary: `In wartime or regional conflict escalations, integrated energy players like ${company.companyName} benefit from structural supply contractions. Spikes in global Brent crude and gas widen Gross Refining Margins (GRMs) and upstream realization, though petrochemical feedstock costs face margin compression.`,
      crudeAndEnergyImpact: 'Surges in Brent crude past $90-$100/bbl expand export crack spreads and upstream crude realizations. Complex refineries capable of sourcing discounted heavy crudes gain distinct cost arbitrage.',
      currencyAndForexImpact: 'Foreign currency and USD-denominated petroleum export revenues provide a natural organic hedge against Indian Rupee (INR) depreciation during global risk-off events.',
      supplyChainAndInflationImpact: 'Maritime tanker reroutings around the Cape of Good Hope and heightened war risk insurance premiums across the Persian Gulf and Red Sea increase per-barrel transport logistics expenses.',
      defenseOrGovernmentCatalyst: 'Designated national strategic energy asset ensuring domestic fuel availability under priority governmental allocations.',
      keyVulnerabilities: [
        'Potential imposition of governmental Special Additional Excise Duty (windfall profit tax) during extreme crude rallies.',
        'Downstream retail fuel price freezes if government mitigates consumer domestic inflation.',
        'Crude tanker freight rate volatility and maritime insurance spikes in conflict straits.',
      ],
      strategicMitigations: [
        'World-class Nelson Complexity Index refineries capable of processing wide grades of global crude.',
        'Extensive forward foreign currency hedging and natural multi-currency export sales.',
        'Diversified non-energy domestic cash flow streams providing resilience against cyclical commodity swings.',
      ],
    };
  }

  // 2. Defense, Aerospace & Security (e.g. HAL, BEL, BDL, MAZDOCK)
  if (
    sector.includes('defense') ||
    sector.includes('aerospace') ||
    name.includes('defence') ||
    name.includes('aerospace') ||
    (name.includes('electronics') && (symbol === 'BEL' || symbol === 'HAL')) ||
    symbol === 'HAL' ||
    symbol === 'BEL' ||
    symbol === 'BDL'
  ) {
    return {
      warRiskPercentage: 16,
      warRiskLevel: 'LOW',
      primaryRiskReason: 'Sovereign procurement priority and Atmanirbhar Bharat indigenization accelerate guaranteed multi-year order book visibility.',
      warRiskFactors: [
        {
          factor: 'Sovereign Order Book Surge',
          weightPercentage: 35,
          direction: 'HEDGE_BUFFER',
          reason: 'Emergency procurement fast-tracks and sovereign defense allocations expand multi-year order book visibility.',
        },
        {
          factor: 'Inflation-Protected Pricing',
          weightPercentage: 25,
          direction: 'HEDGE_BUFFER',
          reason: 'Ministry of Defence contracts operate on cost-plus or escalation-indexed terms, buffering against raw input inflation.',
        },
        {
          factor: 'Specialized Foreign Sub-Assembly Lead Times',
          weightPercentage: 18,
          direction: 'RISK_INCREASE',
          reason: 'Supply lead times for imported microchips, sensors, and specialized alloys require safety inventory buffers.',
        },
      ],
      sectorSensitivity: 'CRITICAL',
      vulnerabilityLevel: 'BENEFICIARY',
      summary: `Armed conflict triggers immediate sovereign defense mobilization, accelerating emergency replenishment orders, capital budget allocations, and indigenous weapon system substitution ('Atmanirbhar Bharat').`,
      crudeAndEnergyImpact: 'Negligible operational sensitivity. Fuel contracts and production utilities are standard government pass-throughs.',
      currencyAndForexImpact: 'Sovereign procurement contracts are fully rupee-guaranteed, while international defense export receipts appreciate with a weaker INR.',
      supplyChainAndInflationImpact: 'Specialized imported avionics, radars, or licensed sub-assemblies face supply-chain lead time scrutiny.',
      defenseOrGovernmentCatalyst: 'Direct beneficiary of fast-tracked Ministry of Defence capital outlays and multi-year procurement pipelines.',
      keyVulnerabilities: [
        'Component shipping delays for specialized imported semiconductors and titanium castings.',
        'Rigid testing and statutory commissioning cycles for frontline military equipment.',
      ],
      strategicMitigations: [
        'Multi-year sovereign order book visibility exceeding 3x-6x annual revenues.',
        'Aggressive indigenization substitution programs minimizing dependence on foreign sub-assemblies.',
      ],
    };
  }

  // 3. Information Technology & Software (e.g. TCS, INFY, WIPRO, HCLTECH)
  if (
    sector.includes('information technology') ||
    sector.includes('it -') ||
    sector.includes('software') ||
    sector.includes('tech') ||
    symbol === 'TCS' ||
    symbol === 'INFY' ||
    symbol === 'WIPRO' ||
    symbol === 'HCLTECH'
  ) {
    return {
      warRiskPercentage: 32,
      warRiskLevel: 'LOW',
      primaryRiskReason: 'Zero physical supply chain sensitivity and major margin gains from INR depreciation offset potential client discretionary IT spend freezes.',
      warRiskFactors: [
        {
          factor: 'Currency Depreciation Margin Expansion',
          weightPercentage: 32,
          direction: 'HEDGE_BUFFER',
          reason: 'Every 1% INR depreciation delivers a 30-45 bps operating margin expansion on USD and EUR receivables.',
        },
        {
          factor: 'Overseas Discretionary Tech Deferrals',
          weightPercentage: 28,
          direction: 'RISK_INCREASE',
          reason: 'Corporate clients in affected overseas markets may delay new digital transformation sign-offs.',
        },
        {
          factor: 'Mission-Critical Digital Operations',
          weightPercentage: 20,
          direction: 'HEDGE_BUFFER',
          reason: 'High share of non-discretionary core maintenance, cloud migration, and cybersecurity contracts.',
        },
      ],
      sectorSensitivity: 'MODERATE',
      vulnerabilityLevel: 'RESILIENT',
      summary: `Indian IT services have zero physical commodity or shipping container exposure. Operations are delivered via globally distributed cloud networks. Prolonged conflict can delay discretionary tech budgets in Europe/US, but sharp rupee depreciation delivers substantial margin gains.`,
      crudeAndEnergyImpact: 'Virtually zero direct energy sensitivity. Corporate travel and campus electricity comprise under 1.5% of operating costs.',
      currencyAndForexImpact: 'Major beneficiary of INR depreciation against USD, EUR, and GBP. Every 1% rupee depreciation expands operating margins by approximately 30-45 basis points.',
      supplyChainAndInflationImpact: 'Digital delivery architecture is immune to naval blockades and maritime logistics bottlenecks.',
      keyVulnerabilities: [
        'Discretionary corporate budget deferrals and elongated client decision cycles in affected overseas markets.',
        'Onsite visa and travel restrictions in conflict-adjacent territories.',
      ],
      strategicMitigations: [
        'High proportion of mission-critical contracts: cloud migration, cybersecurity, and vendor consolidation.',
        'Debt-free balance sheets and multi-billion dollar liquid treasury reserves to withstand demand pauses.',
      ],
    };
  }

  // 4. Banking, Financial Services & NBFCs (e.g. HDFC, ICICI, SBI, AXIS, KOTAK)
  if (
    sector.includes('bank') ||
    sector.includes('financial') ||
    sector.includes('finance') ||
    sector.includes('nbfc') ||
    symbol === 'HDFCBANK' ||
    symbol === 'ICICIBANK' ||
    symbol === 'SBIN' ||
    symbol === 'KOTAKBANK' ||
    symbol === 'AXISBANK'
  ) {
    return {
      warRiskPercentage: 58,
      warRiskLevel: 'MODERATE',
      primaryRiskReason: 'War-induced imported inflation prompts RBI repo rate pauses and bond yield hardening, raising treasury MTM risks.',
      warRiskFactors: [
        {
          factor: 'Central Bank Repo Rate & Liquidity Tightening',
          weightPercentage: 30,
          direction: 'RISK_INCREASE',
          reason: 'Higher crude widens current account deficit, elevating interbank deposit competition.',
        },
        {
          factor: 'Treasury Portfolio MTM Bond Risk',
          weightPercentage: 25,
          direction: 'RISK_INCREASE',
          reason: 'Hardening 10-year Indian sovereign bond yields depress treasury valuations.',
        },
        {
          factor: 'High Capital Adequacy Buffer',
          weightPercentage: 22,
          direction: 'HEDGE_BUFFER',
          reason: 'Capital Adequacy Ratios (CAR > 16%) comfortably cushion credit portfolios.',
        },
      ],
      sectorSensitivity: 'HIGH',
      vulnerabilityLevel: 'MODERATE IMPACT',
      summary: `Banks face secondary macro transmission channels. War-induced imported inflation (crude oil and freight) forces the RBI to maintain elevated repo rates, raising bond yields and treasury mark-to-market risk while tightening liquidity.`,
      crudeAndEnergyImpact: 'Indirect: High crude expands India’s Current Account Deficit (CAD) and tightens banking system liquidity, keeping deposit costs elevated.',
      currencyAndForexImpact: 'RBI foreign exchange market interventions to defend the INR absorb domestic banking liquidity, elevating short-term borrowing costs.',
      supplyChainAndInflationImpact: 'Corporate borrowers dependent on imported commodities may experience working capital compression.',
      keyVulnerabilities: [
        'Treasury portfolio mark-to-market (MTM) losses if 10-year Indian Government Bond yields spike.',
        'Private sector capital expenditure slowdown if elevated rates persist.',
      ],
      strategicMitigations: [
        'High Capital Adequacy Ratios (CAR > 16%) comfortably buffering unexpected credit stress.',
        'Predominance of floating-rate loan books that automatically reprice with benchmark repo adjustments.',
      ],
    };
  }

  // 5. Automotive, Industrials & Capital Goods (e.g. TATAMOTORS, MARUTI, M&M, LT)
  if (
    sector.includes('auto') ||
    sector.includes('industrial') ||
    sector.includes('engineering') ||
    sector.includes('capital goods') ||
    sector.includes('motor') ||
    symbol === 'TATAMOTORS' ||
    symbol === 'MARUTI' ||
    symbol === 'M&M' ||
    symbol === 'LT'
  ) {
    return {
      warRiskPercentage: 76,
      warRiskLevel: 'HIGH',
      primaryRiskReason: 'Severe input cost inflation in industrial commodities (steel, aluminum, copper, rare earths) and container freight surcharges.',
      warRiskFactors: [
        {
          factor: 'Raw Material Commodity Inflation',
          weightPercentage: 35,
          direction: 'RISK_INCREASE',
          reason: 'Sharp price surges in metallurgical fuels, steel, aluminium, and rubber squeeze gross margins.',
        },
        {
          factor: 'Supply Chain & Chip Delivery Delays',
          weightPercentage: 25,
          direction: 'RISK_INCREASE',
          reason: 'Container reroutings around maritime choke points add 2-4 weeks to electronic component arrivals.',
        },
        {
          factor: 'Consumer Demand & Interest Rates',
          weightPercentage: 20,
          direction: 'RISK_INCREASE',
          reason: 'Prolonged high central bank interest rates elevate vehicle financing costs.',
        },
      ],
      sectorSensitivity: 'HIGH',
      vulnerabilityLevel: 'HIGH VULNERABILITY',
      summary: `Industrial manufacturers and automotive OEMs face severe input cost inflation across key raw materials (steel, aluminum, copper, rare earths, rubber) along with container freight surcharges and shipping delays.`,
      crudeAndEnergyImpact: 'Energy-intensive manufacturing plants, foundries, and outbound logistics networks encounter immediate operating cost inflation.',
      currencyAndForexImpact: 'Imported specialized auto components, semiconductors, and electronic control units (ECUs) cost more as the INR softens.',
      supplyChainAndInflationImpact: 'Container reroutings around maritime choke points introduce 2-4 week delivery delays for assembly components.',
      keyVulnerabilities: [
        'Margin compression if input raw material price hikes cannot be swiftly passed to price-sensitive retail buyers.',
        'Automotive loan interest rates remaining elevated due to anti-inflationary central bank stance.',
      ],
      strategicMitigations: [
        'Intensified domestic localization under vendor development programs.',
        'Strategic forward inventory stockpiling of critical electronic microchips and long-term commodity contracts.',
      ],
    };
  }

  // 6. Pharmaceuticals & Healthcare (e.g. SUNPHARMA, CIPLA, DRREDDY)
  if (
    sector.includes('pharma') ||
    sector.includes('health') ||
    sector.includes('drug') ||
    symbol === 'SUNPHARMA' ||
    symbol === 'CIPLA' ||
    symbol === 'DRREDDY'
  ) {
    return {
      warRiskPercentage: 24,
      warRiskLevel: 'LOW',
      primaryRiskReason: 'Inelastic global demand for essential medicines and strong export forex gains offset marginal freight inflation.',
      warRiskFactors: [
        {
          factor: 'Inelastic Essential Demand',
          weightPercentage: 35,
          direction: 'HEDGE_BUFFER',
          reason: 'Global prescription medication consumption is non-cyclical and unaffected by armed conflicts.',
        },
        {
          factor: 'USD Formulation Export Revenues',
          weightPercentage: 28,
          direction: 'HEDGE_BUFFER',
          reason: 'Strong export receipts in USD and EUR appreciate in INR terms.',
        },
        {
          factor: 'Cold-Chain Air Freight Overhead',
          weightPercentage: 16,
          direction: 'RISK_INCREASE',
          reason: 'International pharmaceutical freight surcharges and transit delays.',
        },
      ],
      sectorSensitivity: 'LOW',
      vulnerabilityLevel: 'RESILIENT',
      summary: `Global healthcare consumption is structurally non-cyclical. Demand for generic pharmaceuticals, chronic therapies, and critical medical treatments remains steady regardless of geopolitical hostilities.`,
      crudeAndEnergyImpact: 'Minor cost increases in petroleum-derived chemical solvents and pharmaceutical blister packaging foil.',
      currencyAndForexImpact: 'Substantial export beneficiary: Large-scale pharmaceutical formulations sold in US/EU markets realize higher rupee revenues.',
      supplyChainAndInflationImpact: 'Temperature-controlled air and cold-chain sea cargo rates experience temporary freight surcharges.',
      keyVulnerabilities: [
        'Logistical delays in delivering medicine shipments to conflict-bordering transit corridors.',
      ],
      strategicMitigations: [
        'Global manufacturing footprint with FDA/EMA approved facilities across India and the US.',
        'Substantial multi-month inventory reserves of Active Pharmaceutical Ingredients (APIs).',
      ],
    };
  }

  // 7. FMCG & Consumer Staples (e.g. ITC, HINDUNILVR, NESTLEIND, BRITANNIA)
  if (
    sector.includes('fmcg') ||
    sector.includes('consumer') ||
    sector.includes('food') ||
    symbol === 'ITC' ||
    symbol === 'HINDUNILVR' ||
    symbol === 'NESTLEIND'
  ) {
    return {
      warRiskPercentage: 46,
      warRiskLevel: 'MODERATE',
      primaryRiskReason: 'Steady essential consumption volumes challenged by agricultural and crude-based packaging cost inflation.',
      warRiskFactors: [
        {
          factor: 'Agricultural & Packaging Cost Spikes',
          weightPercentage: 30,
          direction: 'RISK_INCREASE',
          reason: 'Crude polymer packaging and palm oil import price spikes compress gross margins.',
        },
        {
          factor: 'Domestic Brand Equity & Pricing Power',
          weightPercentage: 25,
          direction: 'HEDGE_BUFFER',
          reason: 'Strong brand loyalty enables phased retail price revisions and pack resizing.',
        },
        {
          factor: 'Rural Purchasing Power Fatigue',
          weightPercentage: 18,
          direction: 'RISK_INCREASE',
          reason: 'Imported inflation on domestic fuel and household essentials dampens rural discretionary spend.',
        },
      ],
      sectorSensitivity: 'MODERATE',
      vulnerabilityLevel: 'MODERATE IMPACT',
      summary: `Consumer staples experience resilient demand volumes, but gross margins face compression from global agricultural and petrochemical packaging spikes (palm oil, packaging plastics, wheat, and freight fuels).`,
      crudeAndEnergyImpact: 'Polymer packaging costs and diesel logistics fleets experience direct cost inflation.',
      currencyAndForexImpact: 'Imported inputs such as palm oil and specialty food additives become costlier with INR depreciation.',
      supplyChainAndInflationImpact: 'Domestic supply chains remain uninterrupted; global ingredient imports require inventory management.',
      keyVulnerabilities: [
        'Temporary gross margin contraction before consumer price revisions or grammage changes take effect.',
        'Rural discretionary demand fatigue if fuel inflation dampens household savings.',
      ],
      strategicMitigations: [
        'Extensive domestic agricultural sourcing and deep local contract farming footprints.',
        'Strong brand loyalty and pricing power enabling phased price pass-throughs.',
      ],
    };
  }

  // 8. Metals & Mining (e.g. TATASTEEL, JSWSTEEL, HINDALCO, COALINDIA)
  if (
    sector.includes('metal') ||
    sector.includes('mining') ||
    sector.includes('steel') ||
    symbol === 'TATASTEEL' ||
    symbol === 'JSWSTEEL' ||
    symbol === 'HINDALCO'
  ) {
    return {
      warRiskPercentage: 44,
      warRiskLevel: 'MODERATE',
      primaryRiskReason: 'Tight global steel supply and LME rallies support domestic realisations, balanced by imported coking coal volatility.',
      warRiskFactors: [
        {
          factor: 'Global Metal Supply Tightness & Pricing',
          weightPercentage: 32,
          direction: 'HEDGE_BUFFER',
          reason: 'International supply disruptions elevate LME benchmarks and import-parity prices in India.',
        },
        {
          factor: 'Imported Coking Coal Energy Costs',
          weightPercentage: 28,
          direction: 'RISK_INCREASE',
          reason: 'Volatility in premium hard coking coal contracts adds cost pressures to blast furnaces.',
        },
      ],
      sectorSensitivity: 'HIGH',
      vulnerabilityLevel: 'BENEFICIARY',
      summary: `Wartime disruptions in global metal production and export sanctions typically trigger sharp international London Metal Exchange (LME) and steel price spikes, significantly boosting domestic producers' realization.`,
      crudeAndEnergyImpact: 'Blast furnace operations require captive power or coal linkages; imported coking coal price volatility requires monitoring.',
      currencyAndForexImpact: 'Domestic metal prices are import-parity indexed; INR depreciation elevates the landed cost of imports, protecting domestic realizations.',
      supplyChainAndInflationImpact: 'Maritime bulk shipping rates increase on international export corridors.',
      keyVulnerabilities: [
        'Volatility in imported premium hard coking coal prices.',
      ],
      strategicMitigations: [
        'Captive iron ore mines and domestic coal linkage allocations providing structural low-cost advantages.',
      ],
    };
  }

  // Default / Diversified Fallback
  return {
    warRiskPercentage: 48,
    warRiskLevel: 'MODERATE',
    primaryRiskReason: 'Macro transmission via imported crude inflation, currency swings, and freight surcharges.',
    warRiskFactors: [
      {
        factor: 'Macroeconomic Imported Inflation',
        weightPercentage: 30,
        direction: 'RISK_INCREASE',
        reason: 'Higher crude oil and freight rates filter into domestic inflation.',
      },
      {
        factor: 'Rupee Currency Volatility',
        weightPercentage: 25,
        direction: 'RISK_INCREASE',
        reason: 'Currency shifts impact imported components and capital flows.',
      },
      {
        factor: 'Balance Sheet Leverage Buffer',
        weightPercentage: 20,
        direction: 'HEDGE_BUFFER',
        reason: 'Conservative working capital and domestic cash flows buffer against tightening cycles.',
      },
    ],
    sectorSensitivity: 'MODERATE',
    vulnerabilityLevel: 'MODERATE IMPACT',
    summary: `${company.companyName} exhibits moderate exposure to geopolitical conflict. Primary sensitivity stems from macroeconomic transmission channels: crude oil imported inflation, currency volatility against the US Dollar, and shipping freight surcharges.`,
    crudeAndEnergyImpact: 'High crude oil prices elevate India’s current account deficit and increase domestic logistics overhead.',
    currencyAndForexImpact: 'Fluctuations in the USD/INR currency pair affect imported components and overall capital flow liquidity.',
    supplyChainAndInflationImpact: 'Global maritime route disruptions require adaptive inventory stocking and buffer timelines.',
    keyVulnerabilities: [
      'Macroeconomic imported inflation pressuring domestic consumer purchasing power.',
      'Prolonged high central bank interest rate environment.',
    ],
    strategicMitigations: [
      'Disciplined balance sheet management and conservative working capital leverage.',
      'Active monitoring of supply chains and multi-vendor sourcing frameworks.',
    ],
  };
};

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
  const geopoliticalWarImpact = evaluateWarAndGeopoliticalImpact(company, analysis);

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
    geopoliticalWarImpact,
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
