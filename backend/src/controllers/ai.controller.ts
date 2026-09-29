import { Request, Response, NextFunction } from 'express';
import { runCompanyRagPipeline } from '../services/ragPipeline.service';
import { handleFinancialChat } from '../services/chat.service';
import { ingestCompanyFinancials } from '../services/ingestion.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

const analyzeCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId, query } = req.body;
    const result = await runCompanyRagPipeline({ companyId, query });

    sendSuccess(res, 200, 'Company RAG analysis generated successfully', result);
  } catch (error) {
    next(error);
  }
};

const chatWithCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 401, 'Authentication required for financial chat sessions');
      return;
    }

    const { companyId, message, sessionId } = req.body;
    const result = await handleFinancialChat({
      userId,
      companyId,
      message,
      sessionId,
    });

    sendSuccess(res, 200, 'Chat response generated successfully', result);
  } catch (error) {
    next(error);
  }
};

const ingestCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const result = await ingestCompanyFinancials(id);

    sendSuccess(
      res,
      200,
      `Company financial documents ingested and indexed successfully (${result.documentsGenerated} documents)`,
      result
    );
  } catch (error) {
    next(error);
  }
};

export { analyzeCompany, chatWithCompany, ingestCompany };
