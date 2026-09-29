import { ICompany } from '../../../models/Company.model';
import { generateEmbedding } from '../embeddings/embedding.service';
import { searchSimilarDocuments, upsertDocuments, VectorSearchResult } from '../qdrant/qdrant.service';
import { generateRagDocuments } from '../context/context.service';

export interface RetrievalResult {
  chunks: VectorSearchResult[];
  sources: string[];
  reportingPeriods: string[];
}

const retrieveRelevantFinancialChunks = async (
  company: ICompany,
  query: string,
  limit: number = 4
): Promise<RetrievalResult> => {
  const queryVector = await generateEmbedding(query);
  let searchResults = await searchSimilarDocuments(queryVector, {
    companyId: company._id.toString(),
    symbol: company.symbol,
    limit,
  });

  // If vectors are not yet indexed for this company, ingest on the fly
  if (searchResults.length === 0) {
    const docs = generateRagDocuments(company);
    const docEmbeddings = await Promise.all(
      docs.map((d) => generateEmbedding(d.content))
    );
    await upsertDocuments(docs, docEmbeddings);
    searchResults = await searchSimilarDocuments(queryVector, {
      companyId: company._id.toString(),
      symbol: company.symbol,
      limit,
    });
  }

  const sourcesSet = new Set<string>([company.dataSource || 'Screener.in']);
  const periodsSet = new Set<string>();

  searchResults.forEach((r) => {
    if (r.payload.source) {
      sourcesSet.add(r.payload.source);
    }
    if (r.payload.reportingPeriod && r.payload.reportingPeriod !== 'Latest') {
      periodsSet.add(r.payload.reportingPeriod);
    }
  });

  return {
    chunks: searchResults,
    sources: Array.from(sourcesSet),
    reportingPeriods: Array.from(periodsSet),
  };
};

export { retrieveRelevantFinancialChunks };
