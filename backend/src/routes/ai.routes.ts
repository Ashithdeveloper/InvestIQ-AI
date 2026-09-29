import { Router } from 'express';
import {
  analyzeCompany,
  buyAnalysis,
  sellAnalysis,
  chatWithCompany,
  streamChatWithCompany,
  ingestCompany,
} from '../controllers/ai.controller';
import {
  authenticateToken,
  optionalAuthenticateToken,
} from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  companyAnalysisSchema,
  financialChatSchema,
  buyAnalysisSchema,
  sellAnalysisSchema,
} from '../validators/ai.validator';

const aiRouter = Router();

// 1. POST /api/ai/buy-analysis - AI Buy-Side Analysis & Scenarios
aiRouter.post(
  '/buy-analysis',
  optionalAuthenticateToken,
  validateRequest(buyAnalysisSchema),
  buyAnalysis
);

// 2. POST /api/ai/sell-analysis - AI Sell-Side Analysis & P&L Evaluation
aiRouter.post(
  '/sell-analysis',
  optionalAuthenticateToken,
  validateRequest(sellAnalysisSchema),
  sellAnalysis
);

// 3. POST /api/ai/company-analysis - General RAG Financial Analysis
aiRouter.post(
  '/company-analysis',
  validateRequest(companyAnalysisSchema),
  analyzeCompany
);

// 4. POST /api/ai/chat - Financial Chat with Conversation Context (Requires Auth)
aiRouter.post(
  '/chat',
  authenticateToken,
  validateRequest(financialChatSchema),
  chatWithCompany
);

// 4b. POST /api/ai/chat/stream - Real-time Streaming Financial Chat with SSE
aiRouter.post(
  '/chat/stream',
  optionalAuthenticateToken,
  validateRequest(financialChatSchema),
  streamChatWithCompany
);

// 5. POST /api/ai/ingest/company/:id - Ingest Financial Documents into Qdrant (Requires Auth)
aiRouter.post('/ingest/company/:id', authenticateToken, ingestCompany);

export default aiRouter;
export { aiRouter };

