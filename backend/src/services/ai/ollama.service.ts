export const SYSTEM_PROMPT = `You are InvestIQ - AI, a financial analysis assistant focused on Indian companies.

Use only the financial data provided in the retrieved context.

Rules:
1. Never invent financial figures, company information, or reporting periods.
2. Clearly distinguish verified financial data from explanations and hypothetical scenarios.
3. Explain financial metrics in simple language.
4. Identify missing or outdated information.
5. Explain potential financial risks using the available data.
6. Cite the supplied source and reporting period for financial claims.
7. Do not guarantee profits or investment outcomes.
8. If the provided context is insufficient, clearly state that the available data is insufficient.
9. Do not fabricate stock prices or financial calculations.
10. Do not present speculative statements as verified facts.`;

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaGenerateResponse {
  answer: string;
  model: string;
  done: boolean;
}

const generateOfflineExplanation = (userPrompt: string, contextText: string): string => {
  // Deterministic financial synthesis when Ollama Cloud endpoint is offline
  return `### InvestIQ - AI Financial Analysis

${contextText ? `Based on verified financial records from Screener.in:\n\n${contextText.slice(0, 800)}...` : 'The available data is insufficient to complete the full analysis.'}

**Query Assessment:** ${userPrompt}

**Risk & Governance Considerations:**
- Ensure financial metrics are verified against the latest statutory audited annual reports.
- Valuation ratios (P/E, P/B) should be evaluated in context of historical industry peers.
- All figures cited reflect the respective specified reporting periods.`;
};

const generateFinancialAnalysisWithOllama = async (
  userPrompt: string,
  contextText: string,
  conversationHistory: OllamaMessage[] = []
): Promise<OllamaGenerateResponse> => {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = process.env.OLLAMA_MODEL || 'gpt-oss:4b';

  const messages: OllamaMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
    {
      role: 'user',
      content: `RETRIEVED VERIFIED FINANCIAL CONTEXT:\n${contextText}\n\nUSER QUESTION / TASK:\n${userPrompt}`,
    },
  ];

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as {
        message?: { content: string };
        done?: boolean;
      };
      if (data.message?.content) {
        return {
          answer: data.message.content.trim(),
          model,
          done: data.done ?? true,
        };
      }
    }
  } catch {
    // Graceful fallback on network timeout or offline service
  }

  return {
    answer: generateOfflineExplanation(userPrompt, contextText),
    model: `${model} (fallback)`,
    done: true,
  };
};

export { generateFinancialAnalysisWithOllama, generateOfflineExplanation };
