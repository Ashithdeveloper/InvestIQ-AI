import { Request, Response, NextFunction } from 'express';
import { runCompanyRagPipeline, ingestCompanyFinancials } from '../services/rag';
import { handleFinancialChat, streamFinancialChat } from '../services/ai';
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

    const { companyId, message, sessionId, refreshData } = req.body;

    const result = await handleFinancialChat({
      userId,
      companyId,
      message,
      sessionId,
      refreshData: Boolean(refreshData),
    });

    sendSuccess(res, 200, 'Chat response generated successfully', result);
  } catch (error) {
    next(error);
  }
};

const streamChatWithCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId || 'guest-investor';
    const { companyId, message, sessionId, refreshData } = req.body;

    // Configure Server-Sent Events (SSE) streaming headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    await streamFinancialChat({
      userId,
      companyId,
      message,
      sessionId,
      refreshData: Boolean(refreshData),
      onMetadata: (metadata) => {
        sendEvent('metadata', metadata);
      },
      onToken: (token) => {
        sendEvent('token', { token });
      },
      onComplete: (summary) => {
        sendEvent('done', summary);
        res.end();
      },
      onError: (err) => {
        sendEvent('error', { error: err.message });
        res.end();
      },
    });
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
  streamChatWithCompany,
  ingestCompany,
};

