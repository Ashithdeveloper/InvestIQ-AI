import { Request, Response, NextFunction } from 'express';
import {
  getPersonalizedDashboard,
  getPersonalizedCompanyAnalysis,
} from '../services/dashboard.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 401, 'Authentication required to view personalized dashboard');
      return;
    }

    const dashboardData = await getPersonalizedDashboard(userId);
    sendSuccess(res, 200, 'Personalized dashboard retrieved successfully', dashboardData);
  } catch (error) {
    const customErr = error as Error & { statusCode?: number; data?: Record<string, unknown> };
    if (customErr.statusCode === 400 && customErr.data) {
      res.status(400).json({
        success: false,
        message: customErr.message,
        data: customErr.data,
      });
      return;
    }
    next(error);
  }
};

const getPersonalizedCompanyAnalysisController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.body;
    const userId = req.user?.userId;

    const analysis = await getPersonalizedCompanyAnalysis(companyId, userId);
    sendSuccess(
      res,
      200,
      'Personalized company analysis generated successfully',
      analysis
    );
  } catch (error) {
    next(error);
  }
};

export { getDashboard, getPersonalizedCompanyAnalysisController };
