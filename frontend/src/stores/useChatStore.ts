import { create } from 'zustand';
import { ChatMessage, SendChatMessagePayload } from '../types';
import { chatApi } from '../services/api/chat.api';

interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  selectedCompanyId: string | null;
  isLoading: boolean;
  error: string | null;
  setCompanyId: (companyId: string) => void;
  sendMessage: (messageText: string) => Promise<void>;
  clearChat: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  selectedCompanyId: null,
  isLoading: false,
  error: null,

  setCompanyId(companyId: string): void {
    if (get().selectedCompanyId !== companyId) {
      set({ selectedCompanyId: companyId, messages: [], sessionId: null });
    }
  },

  async sendMessage(messageText: string): Promise<void> {
    const { selectedCompanyId, sessionId, messages } = get();

    if (!selectedCompanyId) {
      set({ error: 'Please select a company before sending questions' });
      return;
    }

    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    set({
      messages: [...messages, userMessage],
      isLoading: true,
      error: null,
    });

    try {
      const payload: SendChatMessagePayload = {
        companyId: selectedCompanyId,
        message: messageText.trim(),
        sessionId: sessionId || undefined,
      };

      const response = await chatApi.sendMessage(payload);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        reportingPeriods: response.reportingPeriods,
        timestamp: new Date().toISOString(),
      };

      set({
        messages: [...get().messages, assistantMessage],
        sessionId: response.sessionId,
        isLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      set({ isLoading: false, error: msg });
    }
  },

  clearChat(): void {
    set({ messages: [], sessionId: null, error: null });
  },

  clearError(): void {
    set({ error: null });
  },
}));
