import { randomUUID } from 'node:crypto';
import { EMBEDDING_DIMENSION } from './embedding.service';
import { IRagDocument } from './ragDocument.service';

export const DEFAULT_COLLECTION_NAME =
  process.env.QDRANT_COLLECTION || 'investiq_company_financials';

export interface VectorSearchResult {
  id: string | number;
  score: number;
  payload: {
    companyId: string;
    symbol: string;
    companyName: string;
    sector: string;
    reportingPeriod: string;
    documentType: string;
    source: string;
    content: string;
  };
}

interface MemoryPoint {
  id: string;
  vector: number[];
  payload: VectorSearchResult['payload'];
}
const memoryStore: Map<string, MemoryPoint> = new Map();

let isQdrantReachable = false;

const getQdrantConfig = () => {
  const url = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/$/, '');
  const apiKey = process.env.QDRANT_API_KEY;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['api-key'] = apiKey;
  }
  return { url, headers };
};

const ensureCollection = async (
  collectionName: string = DEFAULT_COLLECTION_NAME
): Promise<boolean> => {
  const { url, headers } = getQdrantConfig();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const checkRes = await fetch(`${url}/collections/${collectionName}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (checkRes.ok) {
      isQdrantReachable = true;
      return true;
    }

    if (checkRes.status === 404) {
      const createRes = await fetch(`${url}/collections/${collectionName}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          vectors: {
            size: EMBEDDING_DIMENSION,
            distance: 'Cosine',
          },
        }),
      });

      if (createRes.ok) {
        console.log(
          `[Qdrant] Created collection '${collectionName}' with dimension ${EMBEDDING_DIMENSION}`
        );
        isQdrantReachable = true;
        return true;
      }
    }
  } catch {
    // Qdrant server unreachable; fall back to resilient memory store
  }

  isQdrantReachable = false;
  return false;
};

const computeCosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
};

const upsertDocuments = async (
  documents: IRagDocument[],
  embeddings: number[][],
  collectionName: string = DEFAULT_COLLECTION_NAME
): Promise<{ count: number; mode: 'qdrant' | 'memory' }> => {
  await ensureCollection(collectionName);
  const { url, headers } = getQdrantConfig();

  const points = documents.map((doc, idx) => ({
    id: randomUUID(),
    vector: embeddings[idx],
    payload: {
      companyId: doc.companyId,
      symbol: doc.symbol,
      companyName: doc.companyName,
      sector: doc.sector,
      reportingPeriod: doc.reportingPeriod,
      documentType: doc.documentType,
      source: doc.source,
      content: doc.content,
    },
  }));

  if (isQdrantReachable) {
    try {
      const res = await fetch(`${url}/collections/${collectionName}/points`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ points }),
      });

      if (res.ok) {
        return { count: points.length, mode: 'qdrant' };
      }
    } catch {
      // Fallback to memory on failure
    }
  }

  // Fallback in-memory storage
  points.forEach((p) => {
    memoryStore.set(p.id, p);
  });

  return { count: points.length, mode: 'memory' };
};

const deleteCompanyDocuments = async (
  companyId: string,
  collectionName: string = DEFAULT_COLLECTION_NAME
): Promise<void> => {
  const { url, headers } = getQdrantConfig();

  if (isQdrantReachable) {
    try {
      await fetch(`${url}/collections/${collectionName}/points/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: {
            must: [
              {
                key: 'companyId',
                match: { value: companyId },
              },
            ],
          },
        }),
      });
    } catch {
      // Ignore delete errors
    }
  }

  // Delete from in-memory store
  for (const [key, value] of memoryStore.entries()) {
    if (value.payload.companyId === companyId) {
      memoryStore.delete(key);
    }
  }
};

const searchSimilarDocuments = async (
  queryVector: number[],
  options: {
    limit?: number;
    companyId?: string;
    symbol?: string;
    reportingPeriod?: string;
    collectionName?: string;
  }
): Promise<VectorSearchResult[]> => {
  const {
    limit = 5,
    companyId,
    symbol,
    reportingPeriod,
    collectionName = DEFAULT_COLLECTION_NAME,
  } = options;

  await ensureCollection(collectionName);
  const { url, headers } = getQdrantConfig();

  if (isQdrantReachable) {
    try {
      const mustFilters: Record<string, unknown>[] = [];
      if (companyId) {
        mustFilters.push({ key: 'companyId', match: { value: companyId } });
      }
      if (symbol) {
        mustFilters.push({ key: 'symbol', match: { value: symbol.toUpperCase() } });
      }
      if (reportingPeriod) {
        mustFilters.push({ key: 'reportingPeriod', match: { value: reportingPeriod } });
      }

      const body: Record<string, unknown> = {
        vector: queryVector,
        limit,
        with_payload: true,
      };

      if (mustFilters.length > 0) {
        body.filter = { must: mustFilters };
      }

      const res = await fetch(`${url}/collections/${collectionName}/points/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          result?: Array<{
            id: string | number;
            score: number;
            payload: VectorSearchResult['payload'];
          }>;
        };
        if (data.result && Array.isArray(data.result)) {
          return data.result.map((r) => ({
            id: r.id,
            score: r.score,
            payload: r.payload,
          }));
        }
      }
    } catch {
      // Fallback to memory on search failure
    }
  }

  // In-memory similarity search
  const candidates: VectorSearchResult[] = [];

  for (const item of memoryStore.values()) {
    if (companyId && item.payload.companyId !== companyId) continue;
    if (symbol && item.payload.symbol !== symbol.toUpperCase()) continue;
    if (reportingPeriod && item.payload.reportingPeriod !== reportingPeriod) continue;

    const score = computeCosineSimilarity(queryVector, item.vector);
    candidates.push({
      id: item.id,
      score,
      payload: item.payload,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
};

export {
  ensureCollection,
  upsertDocuments,
  deleteCompanyDocuments,
  searchSimilarDocuments,
  computeCosineSimilarity,
};
