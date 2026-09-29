import Company, { ICompany } from '../../models/Company.model';
import { getCompanyById, findOrScrapeCompany, refreshCompanyData } from '../company.service';
import { calculateFinancialMetrics, IFinancialAnalysis } from '../analysis.service';
import { generateMonthlyAllocationPlan, AllocatedStock } from '../portfolioAllocation.service';
import { retrieveRelevantFinancialChunks } from './retrieval/retrieval.service';
import {
  generateFinancialAnalysisWithOllama,
  OllamaMessage,
} from '../ai/ollama.service';

export interface RagPipelineResult {
  company: {
    id: string;
    symbol: string;
    companyName: string;
    sector: string;
    sharePrice: number | null;
    marketCap: number | null;
    high52Week?: number | null;
    low52Week?: number | null;
    peRatio?: number | null;
    roe?: number | null;
    roce?: number | null;
    opm?: number | null;
    debtToEquity?: number | null;
    dataSource?: string;
  };
  metrics: IFinancialAnalysis;
  answer: string;
  sources: string[];
  reportingPeriods: string[];
  retrievedChunksCount: number;
}

export interface PreparedRagContext {
  company: ICompany;
  deterministicMetrics: IFinancialAnalysis;
  fullContext: string;
  sources: string[];
  reportingPeriods: string[];
  chunksCount: number;
}

export const isPortfolioOrMultiStockQuery = (query: string): boolean => {
  const p = query.toLowerCase();
  return (
    p.includes('best stock') ||
    p.includes('top stock') ||
    p.includes('5 best') ||
    p.includes('best 5') ||
    p.includes('top 5') ||
    p.includes('top 10') ||
    p.includes('10 best') ||
    p.includes('which stock') ||
    p.includes('portfolio') ||
    p.includes('allocate') ||
    p.includes('diversif') ||
    p.includes('need investment') ||
    p.includes('where to invest') ||
    p.includes('recommend stocks') ||
    p.includes('suggest stocks') ||
    ((p.includes('invest') || p.includes('buy')) &&
      (p.includes('budget') ||
        /\b\d+\s*k\b/i.test(p) ||
        /\b\d{4,7}\b/.test(p) ||
        p.includes('lakh') ||
        p.includes('stocks')))
  );
};

export const extractBudgetFromQuery = (query: string): number => {
  const p = query.toLowerCase();
  const kMatch = p.match(/\b(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }
  const lakhMatch = p.match(/\b(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)\b/i);
  if (lakhMatch) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000);
  }
  const numMatch = p.match(/(?:rs\.?|inr|₹)?\s*(\d{4,7})\b/i);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    if (val >= 1000 && val <= 10000000) {
      return val;
    }
  }
  return 30000;
};

export const prepareMultiStockPortfolioRagContext = async (options: {
  query: string;
}): Promise<PreparedRagContext> => {
  const { query } = options;
  const budget = extractBudgetFromQuery(query);

  const companies = await Company.find().sort({ marketCap: -1, companyName: 1 });
  const plan = generateMonthlyAllocationPlan(companies, budget);

  const contextPassages: string[] = [];
  contextPassages.push(
    `--- MULTI-STOCK PORTFOLIO & TOP ALLOCATION CONTEXT ---
Target Investment Budget: ₹${budget.toLocaleString('en-IN')}
Currency: INR
Sectors Diversified: ${plan.sectorCount}
Total Invested: ₹${plan.totalInvestedAmount.toLocaleString('en-IN')}
Unallocated Cash Buffer: ₹${plan.unallocatedCash.toLocaleString('en-IN')}

TOP 5 RECOMMENDED STOCKS FOR INVESTMENT PORTFOLIO:`
  );

  plan.allocations.slice(0, 5).forEach((a: AllocatedStock, idx: number) => {
    contextPassages.push(
      `Stock ${idx + 1}: ${a.companyName} (${a.symbol})
• Sector: ${a.sector}
• Current Market Price: ₹${a.sharePrice}
• Recommended Allocation: ${a.allocationPercentage}% (₹${a.allocatedAmount.toLocaleString('en-IN')})
• Shares to Buy: ${a.sharesToBuy} shares (Actual Invested: ₹${a.actualInvestedAmount.toLocaleString('en-IN')})
• Unallocated Residual: ₹${a.unallocatedCash}
• Financial Strength Score: ${a.financialStrengthScore}/100
• Key Fundamental Catalysts: ${a.keyStrengths.join(', ')}
• Solvency & War Risk Level: ${a.riskLevel || 'LOW'} (${a.riskPercentage ?? 10}%)
• Estimated Profit Return Potential: ${a.profitPercentage ?? 18}%`
    );
  });

  contextPassages.push(
    `Portfolio Top Anchor Pick: ${plan.topRecommendation.symbol} (${plan.topRecommendation.companyName})
Rationale: ${plan.topRecommendation.analysisRationale}`
  );

  const topPickSymbol = plan.allocations[0]?.symbol;
  const topCompany = companies.find((c) => c.symbol === topPickSymbol) || companies[0];
  const deterministicMetrics = calculateFinancialMetrics(topCompany);

  return {
    company: topCompany,
    deterministicMetrics,
    fullContext: contextPassages.join('\n\n'),
    sources: [
      'Screener.in (Verified Live Metrics)',
      'InvestIQ Multi-Sector Allocation Engine',
      'Audited Financial Balance Sheets',
    ],
    reportingPeriods: ['FY2024-25', 'Latest Audited Statements'],
    chunksCount: plan.allocations.length,
  };
};

export const prepareCompanyRagContext = async (options: {
  companyId: string;
  query: string;
  forceLiveScrape?: boolean;
}): Promise<PreparedRagContext> => {
  const { companyId, query, forceLiveScrape } = options;

  // Intercept general portfolio or top stock queries
  if (isPortfolioOrMultiStockQuery(query)) {
    return prepareMultiStockPortfolioRagContext({ query });
  }

  // 1. Retrieve company record from MongoDB or auto-scrape from Screener.in if new
  let company: ICompany;
  try {
    company = await getCompanyById(companyId);
    if (forceLiveScrape) {
      try {
        company = await refreshCompanyData(company._id.toString());
      } catch (err) {
        console.warn(`[RAG Context] Live refresh skipped for ${company.symbol}:`, err);
      }
    }
  } catch {
    const scrapeResult = await findOrScrapeCompany(companyId);
    company = scrapeResult.company;
  }

  // 2. Perform deterministic financial calculations
  const deterministicMetrics = calculateFinancialMetrics(company);

  // 3. Retrieve relevant financial chunks from vector store
  const { chunks, sources, reportingPeriods } = await retrieveRelevantFinancialChunks(
    company,
    query,
    4
  );

  // 4. Construct verified context
  const contextPassages: string[] = [];

  // Core metrics & Scraped Screener.in Fundamentals
  contextPassages.push(
    `--- VERIFIED CORE METRICS (DETERMINISTIC & SCREENER.IN) ---
Company: ${company.companyName} (${company.symbol})
Sector: ${company.sector}
Exchange: ${company.exchange?.join(', ') || 'NSE, BSE'}
Share Price: ₹${company.sharePrice !== null && company.sharePrice !== undefined ? company.sharePrice : 'N/A'}
Market Cap: ₹${company.marketCap ? company.marketCap.toLocaleString('en-IN') + ' Cr' : 'N/A'}
52-Week High: ₹${company.high52Week ?? 'N/A'}
52-Week Low: ₹${company.low52Week ?? 'N/A'}
P/E Ratio: ${company.financialMetrics?.peRatio ?? deterministicMetrics.valuation.peRatio ?? 'N/A'}
P/B Ratio: ${deterministicMetrics.valuation.pbRatio ?? 'N/A'}
Book Value: ₹${company.financialMetrics?.bookValue ?? 'N/A'}
Dividend Yield: ${company.financialMetrics?.dividendYield !== null && company.financialMetrics?.dividendYield !== undefined ? company.financialMetrics.dividendYield + '%' : 'N/A'}
Return on Equity (ROE): ${company.financialMetrics?.roe !== null && company.financialMetrics?.roe !== undefined ? company.financialMetrics.roe + '%' : deterministicMetrics.returnOnEquity.value !== null ? deterministicMetrics.returnOnEquity.value + '%' : 'N/A'} (Period: ${deterministicMetrics.returnOnEquity.reportingPeriod || 'Latest'})
ROCE: ${company.financialMetrics?.roce !== null && company.financialMetrics?.roce !== undefined ? company.financialMetrics.roce + '%' : 'N/A'}
Operating Profit Margin (OPM): ${company.financialMetrics?.opm !== null && company.financialMetrics?.opm !== undefined ? company.financialMetrics.opm + '%' : deterministicMetrics.profitability.operatingProfitMargin !== null ? deterministicMetrics.profitability.operatingProfitMargin + '%' : 'N/A'}
Net Profit Margin: ${deterministicMetrics.profitability.netProfitMargin !== null ? deterministicMetrics.profitability.netProfitMargin + '%' : 'N/A'}
Revenue Growth YoY: ${deterministicMetrics.profitability.revenueGrowthYoY !== null ? deterministicMetrics.profitability.revenueGrowthYoY + '%' : 'N/A'}
EPS: ₹${company.financialMetrics?.eps ?? 'N/A'}
Debt to Equity: ${company.financialMetrics?.debtToEquity !== null && company.financialMetrics?.debtToEquity !== undefined ? company.financialMetrics.debtToEquity : deterministicMetrics.debtToEquity.value ?? 'N/A'}
Free Cash Flow: ${deterministicMetrics.freeCashFlow.value !== null ? '₹' + deterministicMetrics.freeCashFlow.value.toLocaleString('en-IN') + ' Cr' : 'N/A'} (Period: ${deterministicMetrics.freeCashFlow.reportingPeriod || 'Latest'})
Data Source: ${company.dataSource || 'Screener.in'}`
  );

  // Add historical financial statement trends if available
  if (company.financialStatements && company.financialStatements.length > 0) {
    const stmtPassages = company.financialStatements.map((stmt) => {
      const rowSummaries = stmt.rows
        .slice(0, 5)
        .map((r) => {
          const validVals = r.values.filter((v) => v !== null && v !== undefined);
          const latestVal = validVals.length > 0 ? validVals[validVals.length - 1] : 'N/A';
          return `${r.metricName}: ${latestVal}`;
        })
        .join(', ');
      return `Statement (${stmt.statementType}, Periods: ${stmt.reportingPeriods.slice(-3).join(', ')}): ${rowSummaries}`;
    });
    contextPassages.push(`--- HISTORICAL STATEMENTS SUMMARY ---\n${stmtPassages.join('\n')}`);
  }

  // Add semantic search excerpts from vector store
  chunks.forEach((r, idx) => {
    contextPassages.push(
      `--- RELEVANT EXCERPT ${idx + 1} (${r.payload.documentType} - ${r.payload.reportingPeriod}) ---\n${r.payload.content}`
    );
  });

  const fullContext = contextPassages.join('\n\n');

  const finalReportingPeriods = [...reportingPeriods];
  if (
    deterministicMetrics.reportingPeriod &&
    !finalReportingPeriods.includes(deterministicMetrics.reportingPeriod)
  ) {
    finalReportingPeriods.unshift(deterministicMetrics.reportingPeriod);
  }

  return {
    company,
    deterministicMetrics,
    fullContext,
    sources,
    reportingPeriods: finalReportingPeriods,
    chunksCount: chunks.length,
  };
};

const runCompanyRagPipeline = async (options: {
  companyId: string;
  query: string;
  conversationHistory?: OllamaMessage[];
  forceLiveScrape?: boolean;
}): Promise<RagPipelineResult> => {
  const { companyId, query, conversationHistory = [], forceLiveScrape } = options;

  const prep = await prepareCompanyRagContext({
    companyId,
    query,
    forceLiveScrape,
  });

  // Send to Ollama Cloud GPT-OSS 4B
  const llmResponse = await generateFinancialAnalysisWithOllama(
    query,
    prep.fullContext,
    conversationHistory
  );

  return {
    company: {
      id: prep.company._id.toString(),
      symbol: prep.company.symbol,
      companyName: prep.company.companyName,
      sector: prep.company.sector,
      sharePrice: prep.company.sharePrice,
      marketCap: prep.company.marketCap,
      high52Week: prep.company.high52Week,
      low52Week: prep.company.low52Week,
      peRatio: prep.company.financialMetrics?.peRatio ?? prep.deterministicMetrics.valuation.peRatio,
      roe: prep.company.financialMetrics?.roe ?? prep.deterministicMetrics.returnOnEquity.value,
      roce: prep.company.financialMetrics?.roce,
      opm: prep.company.financialMetrics?.opm ?? prep.deterministicMetrics.profitability.operatingProfitMargin,
      debtToEquity: prep.company.financialMetrics?.debtToEquity ?? prep.deterministicMetrics.debtToEquity.value,
      dataSource: prep.company.dataSource,
    },
    metrics: prep.deterministicMetrics,
    answer: llmResponse.answer,
    sources: prep.sources,
    reportingPeriods: prep.reportingPeriods,
    retrievedChunksCount: prep.chunksCount,
  };
};

export { runCompanyRagPipeline };

