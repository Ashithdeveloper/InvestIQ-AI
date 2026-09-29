export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'BAAI/bge-small-en-v1.5';
export const EMBEDDING_DIMENSION = 384; // Standard dimension for BAAI/bge-small-en-v1.5

const deterministicFallbackEmbedding = (text: string): number[] => {
  // Deterministic 384-dimensional vector based on text content for offline resilience / testing
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);
  const normalized = text.toLowerCase();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const index = (charCode * (i + 1) + 31) % EMBEDDING_DIMENSION;
    vector[index] = (vector[index] + (charCode / 255.0)) % 1.0;
  }

  // Normalize to unit vector
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1.0;

  return vector.map((v) => parseFloat((v / norm).toFixed(6)));
};

const generateEmbedding = async (text: string): Promise<number[]> => {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = process.env.EMBEDDING_MODEL || 'BAAI/bge-small-en-v1.5';

  if (!text || !text.trim()) {
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        prompt: text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as { embedding?: number[] };
      if (data.embedding && Array.isArray(data.embedding)) {
        if (data.embedding.length === EMBEDDING_DIMENSION) {
          return data.embedding;
        }
        // Pad or truncate to EMBEDDING_DIMENSION if needed
        if (data.embedding.length > EMBEDDING_DIMENSION) {
          return data.embedding.slice(0, EMBEDDING_DIMENSION);
        }
        const padded = [...data.embedding];
        while (padded.length < EMBEDDING_DIMENSION) {
          padded.push(0);
        }
        return padded;
      }
    }
  } catch {
    // Network / offline fallback
  }

  // Graceful deterministic fallback
  return deterministicFallbackEmbedding(text);
};

const generateBatchEmbeddings = async (texts: string[]): Promise<number[][]> => {
  return Promise.all(texts.map((t) => generateEmbedding(t)));
};

export { generateEmbedding, generateBatchEmbeddings, deterministicFallbackEmbedding };
