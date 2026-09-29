import { Request, Response, NextFunction } from 'express';
import { runCompanyRagPipeline, ingestCompanyFinancials } from '../services/rag';
import { handleFinancialChat } from '../services/ai';
import {
  generateBuyAnalysis,
  generateSellAnalysis,
} from '../services/buySellAnalysis.service';
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

const buyAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId, investmentAmount, investmentDuration } = req.body;
    const userId = req.user?.userId;

    const result = await generateBuyAnalysis({
      companyId,
      userId,
      investmentAmount,
      investmentDuration,
    });

    sendSuccess(res, 200, 'AI Buy Analysis generated successfully', result);
  } catch (error) {
    next(error);
  }
};

const sellAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId, purchasePrice, quantityHeld, sharesHeld } = req.body;
    const userId = req.user?.userId;

    const result = await generateSellAnalysis({
      companyId,
      userId,
      purchasePrice,
      quantityHeld: quantityHeld || sharesHeld,
    });

    sendSuccess(res, 200, 'AI Sell Analysis generated successfully', result);
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

export {
  analyzeCompany,
  buyAnalysis,
  sellAnalysis,
  chatWithCompany,
  ingestCompany,
};

