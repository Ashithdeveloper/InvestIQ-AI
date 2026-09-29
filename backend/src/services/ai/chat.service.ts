import { isValidObjectId } from 'mongoose';
import ChatSession, { IChatSession } from '../../models/ChatSession.model';
import { runCompanyRagPipeline } from '../rag/rag.service';
import { OllamaMessage } from './ollama.service';

export interface ChatServiceResponse {
  sessionId: string;
  answer: string;
  sources: string[];
  reportingPeriods: string[];
  metrics: unknown;
  conversationHistoryLength: number;
}

const handleFinancialChat = async (options: {
  userId: string;
  companyId: string;
  message: string;
  sessionId?: string;
}): Promise<ChatServiceResponse> => {
  const { userId, companyId, message, sessionId } = options;

  let session: IChatSession | null = null;

  if (sessionId && isValidObjectId(sessionId)) {
    session = await ChatSession.findById(sessionId);
    if (session && session.userId !== userId) {
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

  // Build Ollama history from last 6 messages
  const history: OllamaMessage[] = session.messages.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Run RAG pipeline
  const ragResult = await runCompanyRagPipeline({
    companyId,
    query: message,
    conversationHistory: history,
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

export { handleFinancialChat };
