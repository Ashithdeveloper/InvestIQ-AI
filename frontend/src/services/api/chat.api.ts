import apiClient from './apiClient';
import { ApiResponse, ChatServiceResponse, SendChatMessagePayload } from '../../types';
import { tokenStorage } from '../storage/tokenStorage';

export interface StreamChatMetadata {
  sessionId: string;
  company: {
    id: string;
    symbol: string;
    companyName: string;
    sector: string;
    sharePrice: number | null;
    high52Week?: number | null;
    low52Week?: number | null;
    peRatio?: number | null;
    roe?: number | null;
    roce?: number | null;
    opm?: number | null;
    debtToEquity?: number | null;
    dataSource?: string;
  };
  sources: string[];
  reportingPeriods: string[];
  isLiveScraped: boolean;
  scrapedAt: string;
}

export interface StreamChatCallbacks {
  onMetadata?: (meta: StreamChatMetadata) => void;
  onToken?: (token: string) => void;
  onComplete?: (summary: {
    sessionId: string;
    fullAnswer: string;
    sources: string[];
    reportingPeriods: string[];
  }) => void;
  onError?: (err: Error) => void;
}

export const chatApi = {
  async sendMessage(payload: SendChatMessagePayload): Promise<ChatServiceResponse> {
    const res = await apiClient.post<ApiResponse<ChatServiceResponse>>('/ai/chat', payload);
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to send chat message');
    }
    return res.data.data;
  },

  streamChatMessage(
    payload: SendChatMessagePayload,
    callbacks: StreamChatCallbacks
  ): () => void {
    const baseUrl = apiClient.defaults.baseURL || 'http://localhost:5000/api';
    const url = `${baseUrl}/ai/chat/stream`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    tokenStorage.getToken().then((token) => {
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(JSON.stringify(payload));
    }).catch(() => {
      xhr.send(JSON.stringify(payload));
    });

    let lastIndex = 0;
    let accumulatedAnswer = '';
    let currentSessionId = payload.sessionId || '';
    let currentSources: string[] = [];
    let currentPeriods: string[] = [];

    const parseBuffer = (chunk: string) => {
      const lines = chunk.split('\n');
      let currentEvent = 'message';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('event:')) {
          currentEvent = line.replace('event:', '').trim();
        } else if (line.startsWith('data:')) {
          const rawData = line.replace('data:', '').trim();
          try {
            const parsed = JSON.parse(rawData);
            if (currentEvent === 'metadata') {
              if (parsed.sessionId) currentSessionId = parsed.sessionId;
              if (parsed.sources) currentSources = parsed.sources;
              if (parsed.reportingPeriods) currentPeriods = parsed.reportingPeriods;
              callbacks.onMetadata?.(parsed);
            } else if (currentEvent === 'token') {
              const token = parsed.token ?? '';
              accumulatedAnswer += token;
              callbacks.onToken?.(token);
            } else if (currentEvent === 'done') {
              callbacks.onComplete?.({
                sessionId: parsed.sessionId || currentSessionId,
                fullAnswer: parsed.fullAnswer || accumulatedAnswer,
                sources: parsed.sources || currentSources,
                reportingPeriods: parsed.reportingPeriods || currentPeriods,
              });
            } else if (currentEvent === 'error') {
              callbacks.onError?.(new Error(parsed.error || 'Streaming error'));
            }
          } catch {
            // Wait for next complete chunk
          }
        }
      }
    };

    xhr.onprogress = () => {
      const newText = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      parseBuffer(newText);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const remaining = xhr.responseText.substring(lastIndex);
        if (remaining) parseBuffer(remaining);
      } else {
        callbacks.onError?.(new Error(`AI Chat request failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      callbacks.onError?.(new Error('Network connection error with AI service'));
    };

    return () => {
      try {
        xhr.abort();
      } catch {
        // Safe abort
      }
    };
  },

  async runAiAnalysis(companyId: string, query: string): Promise<{ answer: string; sources: string[]; reportingPeriods: string[] }> {
    const res = await apiClient.post<
      ApiResponse<{ answer: string; sources: string[]; reportingPeriods: string[] }>
    >('/ai/company-analysis', {
      companyId,
      query,
    });
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to run AI analysis');
    }
    return res.data.data;
  },
};
