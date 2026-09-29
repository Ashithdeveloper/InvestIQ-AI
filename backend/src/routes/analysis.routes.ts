import { Router } from 'express';
import { getCompanyAnalysis } from '../controllers/analysis.controller';

const analysisRouter = Router();

// GET /api/analysis/company/:id - Deterministic financial metrics calculation
analysisRouter.get('/company/:id', getCompanyAnalysis);

export default analysisRouter;
export { analysisRouter };
