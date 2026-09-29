import { getCompanyById } from './company.service';
import { generateRagDocuments } from './ragDocument.service';
import { generateEmbedding } from './embedding.service';
import { deleteCompanyDocuments, upsertDocuments } from './qdrant.service';

export interface IngestionResult {
  companyId: string;
  symbol: string;
  companyName: string;
  documentsGenerated: number;
  vectorsStored: number;
  storageMode: 'qdrant' | 'memory';
  documentTypes: string[];
}

const ingestCompanyFinancials = async (companyId: string): Promise<IngestionResult> => {
  const company = await getCompanyById(companyId);

  // 1. Generate structured RAG documents
  const docs = generateRagDocuments(company);

  if (docs.length === 0) {
    const error = new Error('No financial documents could be generated for this company') as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }

  // 2. Remove any existing vectors for this company to prevent duplicate embeddings
  await deleteCompanyDocuments(company._id.toString());

  // 3. Generate embeddings with BAAI/bge-small-en-v1.5 (dimension 384)
  const embeddings = await Promise.all(docs.map((d) => generateEmbedding(d.content)));

  // 4. Store documents and vectors in Qdrant (with memory fallback)
  const { count, mode } = await upsertDocuments(docs, embeddings);

  const documentTypes = Array.from(new Set(docs.map((d) => d.documentType)));

  return {
    companyId: company._id.toString(),
    symbol: company.symbol,
    companyName: company.companyName,
    documentsGenerated: docs.length,
    vectorsStored: count,
    storageMode: mode,
    documentTypes,
  };
};

export { ingestCompanyFinancials };
