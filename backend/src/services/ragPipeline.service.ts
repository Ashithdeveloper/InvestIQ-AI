import { ICompany } from '../models/Company.model';
import { getCompanyById } from './company.service';
import { calculateFinancialMetrics, IFinancialAnalysis } from './analysis.service';
import { generateEmbedding } from './embedding.service';
import { searchSimilarDocuments, upsertDocuments } from './qdrant.service';
import { generateRagDocuments } from './ragDocument.service';
import {
  generateFinancialAnalysisWithOllama,
  OllamaMessage,
} from './ollama.service';

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

  // 3. Search vector store for relevant contextual chunks
  const queryVector = await generateEmbedding(query);
  let searchResults = await searchSimilarDocuments(queryVector, {
    companyId: company._id.toString(),
    symbol: company.symbol,
    limit: 4,
  });

  // If vectors not yet populated for this company, ingest on the fly
  if (searchResults.length === 0) {
    const docs = generateRagDocuments(company);
    const docEmbeddings = await Promise.all(
      docs.map((d) => generateEmbedding(d.content))
    );
    await upsertDocuments(docs, docEmbeddings);
    searchResults = await searchSimilarDocuments(queryVector, {
      companyId: company._id.toString(),
      symbol: company.symbol,
      limit: 4,
    });
  }

  // 4. Extract sources and reporting periods from retrieved chunks
  const sourcesSet = new Set<string>([company.dataSource || 'Screener.in']);
  const periodsSet = new Set<string>();

  if (deterministicMetrics.reportingPeriod) {
    periodsSet.add(deterministicMetrics.reportingPeriod);
  }

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

  // Add semantic search chunks
  searchResults.forEach((r, idx) => {
    sourcesSet.add(r.payload.source || 'Screener.in');
    if (r.payload.reportingPeriod && r.payload.reportingPeriod !== 'Latest') {
      periodsSet.add(r.payload.reportingPeriod);
    }
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
    sources: Array.from(sourcesSet),
    reportingPeriods: Array.from(periodsSet),
    retrievedChunksCount: searchResults.length,
  };
};

export { runCompanyRagPipeline };
