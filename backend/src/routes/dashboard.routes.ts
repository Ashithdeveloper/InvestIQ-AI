import { Router } from 'express';
import {
  getDashboard,
  getPersonalizedCompanyAnalysisController,
} from '../controllers/dashboard.controller';
import {
  authenticateToken,
  optionalAuthenticateToken,
} from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { personalizedCompanyAnalysisSchema } from '../validators/dashboard.validator';

const dashboardRouter = Router();

// GET /api/dashboard - Retrieve personalized dashboard with company metrics and risk profiles
dashboardRouter.get('/', authenticateToken, getDashboard);

// POST /api/dashboard/company-analysis - Explainable RAG company analysis tailored to financial profile
dashboardRouter.post(
  '/company-analysis',
  optionalAuthenticateToken,
  validateRequest(personalizedCompanyAnalysisSchema),
  getPersonalizedCompanyAnalysisController
);

export default dashboardRouter;
export { dashboardRouter };
