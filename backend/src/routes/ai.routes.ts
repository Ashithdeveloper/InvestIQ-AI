import { Router } from 'express';
import {
  analyzeCompany,
  chatWithCompany,
  ingestCompany,
} from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  companyAnalysisSchema,
  financialChatSchema,
} from '../validators/ai.validator';

const aiRouter = Router();

// POST /api/ai/company-analysis - RAG Financial Analysis
aiRouter.post(
  '/company-analysis',
  validateRequest(companyAnalysisSchema),
  analyzeCompany
);

// POST /api/ai/chat - Financial Chat with Conversation Context (Requires Auth)
aiRouter.post(
  '/chat',
  authenticateToken,
  validateRequest(financialChatSchema),
  chatWithCompany
);

// POST /api/ai/ingest/company/:id - Ingest Financial Documents into Qdrant (Requires Auth)
aiRouter.post('/ingest/company/:id', authenticateToken, ingestCompany);

export default aiRouter;
export { aiRouter };
