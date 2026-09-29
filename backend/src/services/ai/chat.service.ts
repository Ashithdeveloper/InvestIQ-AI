import { isValidObjectId } from 'mongoose';
import ChatSession, { IChatSession } from '../../models/ChatSession.model';
import Company, { ICompany } from '../../models/Company.model';
import {
  runCompanyRagPipeline,
  prepareCompanyRagContext,
  isPortfolioOrMultiStockQuery,
} from '../rag/rag.service';
import { OllamaMessage, streamFinancialAnalysisWithOllama } from './ollama.service';

export interface ChatServiceResponse {
  sessionId: string;
  answer: string;
  sources: string[];
  reportingPeriods: string[];
  metrics: unknown;
  conversationHistoryLength: number;
}

export interface StreamChatOptions {
  userId: string;
  companyId: string;
  message: string;
  sessionId?: string;
  refreshData?: boolean;
  onMetadata: (metadata: {
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
  }) => void;
  onToken: (token: string) => void;
  onComplete: (summary: {
    sessionId: string;
    fullAnswer: string;
    sources: string[];
    reportingPeriods: string[];
    conversationHistoryLength: number;
  }) => void;
  onError: (error: Error) => void;
}

const detectMentionedCompany = async (
  query: string,
  currentCompanyId: string
): Promise<ICompany | null> => {
  const words = query
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (words.length === 0) return null;

  // 1. Direct symbol match
  const symbolMatch = await Company.findOne({ symbol: { $in: words } });
  if (symbolMatch && symbolMatch._id.toString() !== currentCompanyId) {
    return symbolMatch;
  }

  // 2. Company name match
  const STOPWORDS = new Set([
    'WHAT', 'ABOUT', 'TELL', 'PRICE', 'STOCK', 'SHARE', 'RATIO', 'SAFE',
    'DEBT', 'BUY', 'SELL', 'PE', 'ROE', 'CASH', 'FLOW', 'BEST', 'TOP',
    'INVEST', 'INVESTMENT', 'WHICH', 'MANY', 'HOW', 'MUCH', 'GOOD', 'COMPANY',
    'THIS', 'THAT', 'THE', 'AND', 'FOR', 'WITH', 'NEED', 'CAN', 'SHOULD',
    'WOULD', 'RECOMMEND', 'SUGGEST', 'PORTFOLIO', 'STOCKS',
  ]);

  for (const w of words) {
    if (STOPWORDS.has(w) || w.length < 3) continue;
    const nameMatch = await Company.findOne({
      companyName: { $regex: new RegExp(`\\b${w}\\b`, 'i') },
    });
    if (nameMatch && nameMatch._id.toString() !== currentCompanyId) {
      return nameMatch;
    }
  }

  return null;
};

const handleFinancialChat = async (options: {
  userId: string;
  companyId: string;
  message: string;
  sessionId?: string;
  refreshData?: boolean;
}): Promise<ChatServiceResponse> => {
  const { userId, companyId, message, sessionId, refreshData } = options;

  let session: IChatSession | null = null;

  if (sessionId && isValidObjectId(sessionId)) {
    session = await ChatSession.findById(sessionId);
    if (session && session.userId !== userId && userId !== 'guest-investor') {
      const error = new Error('Unauthorized access to chat session') as Error & {
        statusCode: number;
      };
      error.statusCode = 403;
      throw error;
    }
  }

  if (!session) {
    session = new ChatSession({
      userId,
      companyId,
      messages: [],
    });
  }

  // Detect query scope: multi-stock portfolio vs specific mentioned company vs active company
  const isMultiStock = isPortfolioOrMultiStockQuery(message);
  let effectiveCompanyId = companyId;

  if (!isMultiStock) {
    const mentioned = await detectMentionedCompany(message, companyId);
    if (mentioned) {
      effectiveCompanyId = mentioned._id.toString();
    }
  }

  // Build Ollama history from last 6 messages
  const history: OllamaMessage[] = session.messages.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Run RAG pipeline with optional live refresh
  const ragResult = await runCompanyRagPipeline({
    companyId: effectiveCompanyId,
    query: message,
    conversationHistory: history,
    forceLiveScrape: refreshData,
  });

  // Append user message
  session.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date(),
  });

  // Append assistant message
  session.messages.push({
    role: 'assistant',
    content: ragResult.answer,
    sources: ragResult.sources,
    reportingPeriods: ragResult.reportingPeriods,
    timestamp: new Date(),
  });

  await session.save();

  return {
    sessionId: session._id.toString(),
    answer: ragResult.answer,
    sources: ragResult.sources,
    reportingPeriods: ragResult.reportingPeriods,
    metrics: ragResult.metrics,
    conversationHistoryLength: session.messages.length,
  };
};

const streamFinancialChat = async (options: StreamChatOptions): Promise<void> => {
  const {
    userId,
    companyId,
    message,
    sessionId,
    refreshData,
    onMetadata,
    onToken,
    onComplete,
    onError,
  } = options;

  try {
    let session: IChatSession | null = null;

    if (sessionId && isValidObjectId(sessionId)) {
      session = await ChatSession.findById(sessionId);
      if (session && session.userId !== userId && userId !== 'guest-investor') {
        throw new Error('Unauthorized access to chat session');
      }
    }

    if (!session) {
      session = new ChatSession({
        userId,
        companyId,
        messages: [],
      });
      await session.save();
    }

    const currentSessionId = session._id.toString();

    // Detect query scope: multi-stock portfolio vs specific mentioned company vs active company
    const isMultiStock = isPortfolioOrMultiStockQuery(message);
    let effectiveCompanyId = companyId;

    if (!isMultiStock) {
      const mentioned = await detectMentionedCompany(message, companyId);
      if (mentioned) {
        effectiveCompanyId = mentioned._id.toString();
      }
    }

    // 1. Prepare RAG verified context & Scraped Screener fundamentals
    const prep = await prepareCompanyRagContext({
      companyId: effectiveCompanyId,
      query: message,
      forceLiveScrape: refreshData,
    });

    const isLiveScraped = Boolean(
      prep.company.dataSource?.includes('Screener') || refreshData || isMultiStock
    );
    const scrapedAt = prep.company.lastUpdated
      ? new Date(prep.company.lastUpdated).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Just now';

    // 2. Emit initial metadata payload (Company info, Scraped metrics, Sources)
    onMetadata({
      sessionId: currentSessionId,
      company: {
        id: prep.company._id.toString(),
        symbol: isMultiStock ? 'TOP 5 BASKET' : prep.company.symbol,
        companyName: isMultiStock
          ? 'Top 5 Recommended Indian Stocks'
          : prep.company.companyName,
        sector: isMultiStock ? 'Multi-Sector Portfolio' : prep.company.sector,
        sharePrice: isMultiStock ? null : prep.company.sharePrice,
        high52Week: prep.company.high52Week,
        low52Week: prep.company.low52Week,
        peRatio:
          prep.company.financialMetrics?.peRatio ?? prep.deterministicMetrics.valuation.peRatio,
        roe: prep.company.financialMetrics?.roe ?? prep.deterministicMetrics.returnOnEquity.value,
        roce: prep.company.financialMetrics?.roce,
        opm:
          prep.company.financialMetrics?.opm ??
          prep.deterministicMetrics.profitability.operatingProfitMargin,
        debtToEquity:
          prep.company.financialMetrics?.debtToEquity ??
          prep.deterministicMetrics.debtToEquity.value,
        dataSource: isMultiStock
          ? 'Screener.in (Multi-Stock Allocation)'
          : prep.company.dataSource,
      },
      sources: prep.sources,
      reportingPeriods: prep.reportingPeriods,
      isLiveScraped,
      scrapedAt,
    });

    // 3. Build history from last 6 messages
    const history: OllamaMessage[] = session.messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 4. Stream tokens
    let fullAnswer = '';
    for await (const token of streamFinancialAnalysisWithOllama(
      message,
      prep.fullContext,
      history
    )) {
      fullAnswer += token;
      onToken(token);
    }

    // 5. Append messages to DB session
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    session.messages.push({
      role: 'assistant',
      content: fullAnswer,
      sources: prep.sources,
      reportingPeriods: prep.reportingPeriods,
      timestamp: new Date(),
    });

    await session.save();

    // 6. Complete notification
    onComplete({
      sessionId: currentSessionId,
      fullAnswer,
      sources: prep.sources,
      reportingPeriods: prep.reportingPeriods,
      conversationHistoryLength: session.messages.length,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError(error);
  }
};

export { handleFinancialChat, streamFinancialChat };
