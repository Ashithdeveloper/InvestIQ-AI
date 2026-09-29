import { ICompany } from '../../models/Company.model';
import { getCompanyById } from '../company.service';
import { calculateFinancialMetrics, IFinancialAnalysis } from '../analysis.service';
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
  };
  metrics: IFinancialAnalysis;
  answer: string;
  sources: string[];
  reportingPeriods: string[];
  retrievedChunksCount: number;
}

const runCompanyRagPipeline = async (options: {
  companyId: string;
  query: string;
  conversationHistory?: OllamaMessage[];
}): Promise<RagPipelineResult> => {
  const { companyId, query, conversationHistory = [] } = options;

  // 1. Retrieve company record from MongoDB
  const company: ICompany = await getCompanyById(companyId);

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

  // Always include verified core metrics in the top context
  contextPassages.push(
    `--- VERIFIED CORE METRICS (DETERMINISTIC) ---
Company: ${company.companyName} (${company.symbol})
Sector: ${company.sector}
Share Price: ₹${company.sharePrice ?? 'N/A'}
Market Cap: ₹${company.marketCap ? company.marketCap.toLocaleString('en-IN') + ' Cr' : 'N/A'}
Free Cash Flow: ${deterministicMetrics.freeCashFlow.value !== null ? '₹' + deterministicMetrics.freeCashFlow.value.toLocaleString('en-IN') + ' Cr' : 'N/A'} (Period: ${deterministicMetrics.freeCashFlow.reportingPeriod || 'Latest'})
Return on Equity: ${deterministicMetrics.returnOnEquity.value !== null ? deterministicMetrics.returnOnEquity.value + '%' : 'N/A'} (Period: ${deterministicMetrics.returnOnEquity.reportingPeriod || 'Latest'})
Debt to Equity: ${deterministicMetrics.debtToEquity.value !== null ? deterministicMetrics.debtToEquity.value : 'N/A'}
Revenue Growth YoY: ${deterministicMetrics.profitability.revenueGrowthYoY !== null ? deterministicMetrics.profitability.revenueGrowthYoY + '%' : 'N/A'}
Net Profit Margin: ${deterministicMetrics.profitability.netProfitMargin !== null ? deterministicMetrics.profitability.netProfitMargin + '%' : 'N/A'}
Operating Profit Margin: ${deterministicMetrics.profitability.operatingProfitMargin !== null ? deterministicMetrics.profitability.operatingProfitMargin + '%' : 'N/A'}
P/E Ratio: ${deterministicMetrics.valuation.peRatio ?? 'N/A'}
P/B Ratio: ${deterministicMetrics.valuation.pbRatio ?? 'N/A'}`
  );

  // Add semantic search excerpts
  chunks.forEach((r, idx) => {
    contextPassages.push(
      `--- RELEVANT EXCERPT ${idx + 1} (${r.payload.documentType} - ${r.payload.reportingPeriod}) ---\n${r.payload.content}`
    );
  });

  const fullContext = contextPassages.join('\n\n');

  // 5. Send to Ollama Cloud GPT-OSS 4B
  const llmResponse = await generateFinancialAnalysisWithOllama(
    query,
    fullContext,
    conversationHistory
  );

  const finalReportingPeriods = [...reportingPeriods];
  if (
    deterministicMetrics.reportingPeriod &&
    !finalReportingPeriods.includes(deterministicMetrics.reportingPeriod)
  ) {
    finalReportingPeriods.unshift(deterministicMetrics.reportingPeriod);
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
    metrics: deterministicMetrics,
    answer: llmResponse.answer,
    sources,
    reportingPeriods: finalReportingPeriods,
    retrievedChunksCount: chunks.length,
  };
};

export { runCompanyRagPipeline };
