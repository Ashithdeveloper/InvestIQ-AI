import { create } from 'zustand';
import { ChatMessage, SendChatMessagePayload } from '../types';
import { chatApi, StreamChatMetadata } from '../services/api/chat.api';
import { companyApi } from '../services/api/company.api';

interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  selectedCompanyId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  streamingText: string;
  streamingMetadata: StreamChatMetadata | null;
  isRefreshingLive: boolean;
  error: string | null;
  setCompanyId: (companyId: string) => void;
  sendMessage: (messageText: string, options?: { forceRefresh?: boolean }) => Promise<void>;
  refreshActiveCompanyLive: () => Promise<void>;
  clearChat: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  selectedCompanyId: null,
  isLoading: false,
  isStreaming: false,
  streamingText: '',
  streamingMetadata: null,
  isRefreshingLive: false,
  error: null,

  setCompanyId(companyId: string): void {
    if (get().selectedCompanyId !== companyId) {
      set({
        selectedCompanyId: companyId,
        messages: [],
        sessionId: null,
        streamingText: '',
        isStreaming: false,
        streamingMetadata: null,
      });
    }
  },

  async refreshActiveCompanyLive(): Promise<void> {
    const { selectedCompanyId } = get();
    if (!selectedCompanyId) return;

    set({ isRefreshingLive: true, error: null });
    try {
      await companyApi.refreshCompanyData(selectedCompanyId);
      set({ isRefreshingLive: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh live scraped data';
      set({ isRefreshingLive: false, error: msg });
    }
  },

  async sendMessage(messageText: string, options?: { forceRefresh?: boolean }): Promise<void> {
    const { selectedCompanyId, sessionId, messages } = get();

    if (!selectedCompanyId) {
      set({ error: 'Please select a company before sending questions' });
      return;
    }

    const trimmed = messageText.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    set({
      messages: [...messages, userMessage],
      isLoading: true,
      isStreaming: true,
      streamingText: '',
      streamingMetadata: null,
      error: null,
    });

    const payload: SendChatMessagePayload = {
      companyId: selectedCompanyId,
      message: trimmed,
      sessionId: sessionId || undefined,
      refreshData: options?.forceRefresh,
    };

    let streamCompleted = false;

    try {
      chatApi.streamChatMessage(payload, {
        onMetadata: (metadata) => {
          set({ streamingMetadata: metadata });
        },
        onToken: (token) => {
          set((state) => ({
            streamingText: state.streamingText + token,
            isLoading: false,
          }));
        },
        onComplete: (summary) => {
          streamCompleted = true;
          const { streamingMetadata, messages: currMsgs } = get();

          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: summary.fullAnswer || get().streamingText,
            sources: summary.sources || streamingMetadata?.sources,
            reportingPeriods: summary.reportingPeriods || streamingMetadata?.reportingPeriods,
            isLiveScraped: streamingMetadata?.isLiveScraped ?? true,
            scrapedAt: streamingMetadata?.scrapedAt,
            companyInfo: streamingMetadata?.company,
            timestamp: new Date().toISOString(),
          };

          set({
            messages: [...currMsgs, assistantMessage],
            sessionId: summary.sessionId,
            isLoading: false,
            isStreaming: false,
            streamingText: '',
            streamingMetadata: null,
          });
        },
        onError: async (streamErr) => {
          if (!streamCompleted) {
            console.warn('[Chat Stream] Falling back to standard JSON chat:', streamErr);
            try {
              const response = await chatApi.sendMessage(payload);
              const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response.answer,
                sources: response.sources,
                reportingPeriods: response.reportingPeriods,
                isLiveScraped: true,
                timestamp: new Date().toISOString(),
              };

              set({
                messages: [...get().messages, assistantMessage],
                sessionId: response.sessionId,
                isLoading: false,
                isStreaming: false,
                streamingText: '',
                streamingMetadata: null,
              });
            } catch (fallbackErr: unknown) {
              const msg =
                fallbackErr instanceof Error
                  ? fallbackErr.message
                  : 'Failed to generate response';
              set({
                isLoading: false,
                isStreaming: false,
                streamingText: '',
                streamingMetadata: null,
                error: msg,
              });
            }
          }
        },
      });
    } catch {
      // Direct fallback
      try {
        const response = await chatApi.sendMessage(payload);
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.answer,
          sources: response.sources,
          reportingPeriods: response.reportingPeriods,
          isLiveScraped: true,
          timestamp: new Date().toISOString(),
        };

        set({
          messages: [...get().messages, assistantMessage],
          sessionId: response.sessionId,
          isLoading: false,
          isStreaming: false,
          streamingText: '',
          streamingMetadata: null,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to send message';
        set({
          isLoading: false,
          isStreaming: false,
          streamingText: '',
          streamingMetadata: null,
          error: msg,
        });
      }
    }
  },

  clearChat(): void {
    set({
      messages: [],
      sessionId: null,
      error: null,
      streamingText: '',
      isStreaming: false,
      streamingMetadata: null,
    });
  },

  clearError(): void {
    set({ error: null });
  },
}));
