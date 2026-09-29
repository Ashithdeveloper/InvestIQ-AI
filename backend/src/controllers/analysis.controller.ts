import { Request, Response, NextFunction } from 'express';
import { getCompanyById } from '../services/company.service';
import { calculateFinancialMetrics } from '../services/analysis.service';
import { sendSuccess } from '../utils/apiResponse';

const getCompanyAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const company = await getCompanyById(id);
    const analysis = calculateFinancialMetrics(company);

    sendSuccess(res, 200, 'Company financial analysis calculated successfully', analysis);
  } catch (error) {
    next(error);
  }
};

export { getCompanyAnalysis };
