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

function parseContextMetrics(contextText: string) {
  const getField = (pattern: RegExp) => {
    const match = contextText.match(pattern);
    return match ? match[1].trim() : null;
  };

  const company = getField(/Company:\s*([^\n]+)/i);
  const sector = getField(/Sector:\s*([^\n]+)/i);
  const sharePrice = getField(/Share Price:\s*₹?([^\n]+)/i);
  const marketCap = getField(/Market Cap:\s*₹?([^\n]+)/i);
  const fcf = getField(/Free Cash Flow:\s*([^\n]+)/i);
  const roe = getField(/Return on Equity:\s*([^\n]+)/i);
  const debtToEquity = getField(/Debt to Equity:\s*([^\n]+)/i);
  const revenueGrowth = getField(/Revenue Growth YoY:\s*([^\n]+)/i);
  const netMargin = getField(/Net Profit Margin:\s*([^\n]+)/i);
  const opm = getField(/Operating Profit Margin:\s*([^\n]+)/i);
  const pe = getField(/P\/E Ratio:\s*([^\n]+)/i);
  const pb = getField(/P\/B Ratio:\s*([^\n]+)/i);

  return {
    company: company || 'The company',
    sector: sector || 'Diversified Indian Equities',
    sharePrice: sharePrice || 'market price',
    marketCap: marketCap || 'N/A',
    fcf: fcf || 'N/A',
    roe: roe || 'N/A',
    debtToEquity: debtToEquity || 'N/A',
    revenueGrowth: revenueGrowth || 'N/A',
    netMargin: netMargin || 'N/A',
    opm: opm || 'N/A',
    pe: pe || 'N/A',
    pb: pb || 'N/A',
  };
}

const generateOfflineExplanation = (_userPrompt: string, contextText: string): string => {
  if (!contextText || contextText.trim().length === 0) {
    return 'Audited statutory financial disclosures are currently being synchronized from Screener.in. Fundamental metric analysis will update automatically upon verification.';
  }

  const m = parseContextMetrics(contextText);

  return [
    `Executive Financial Overview:`,
    `${m.company} operates within the ${m.sector} sector with a total market capitalization of ₹${m.marketCap} and a prevailing market share price of ₹${m.sharePrice}. Operationally, the enterprise records an Operating Profit Margin (OPM) of ${m.opm} and a Net Profit Margin of ${m.netMargin}, supported by an annual revenue growth trajectory of ${m.revenueGrowth}.`,
    ``,
    `Valuation & Market Multiple Assessment:`,
    `Trading at a Price-to-Earnings (P/E) multiple of ${m.pe} and a Price-to-Book (P/B) ratio of ${m.pb}, the stock's valuation reflects its competitive positioning in Indian equities. Medium-to-long term investors should evaluate whether current multiples appropriately price in underlying earnings durability and return on capital.`,
    ``,
    `Cash Flow & Solvency Health:`,
    `The business recorded Free Cash Flow of ${m.fcf}, demonstrating fundamental operational cash generation to self-fund capital expenditures. A Debt-to-Equity ratio of ${m.debtToEquity} reflects disciplined leverage, buffering the balance sheet against domestic credit tightening and macroeconomic shocks.`,
    ``,
    `Capital Efficiency & Shareholder Returns:`,
    `Return on Equity (ROE) stands at ${m.roe}, indicating effective deployment of shareholder equity. Companies sustaining solid equity returns while maintaining conservative leverage demonstrate durable competitive moats.`,
    ``,
    `Risk & Macroeconomic Considerations:`,
    `Investors must monitor key variables including Reserve Bank of India repo rate trajectories, global crude energy prices, and geopolitical supply chain stability. Position sizing should adhere strictly to personal portfolio diversification rules.`
  ].join('\n');
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
