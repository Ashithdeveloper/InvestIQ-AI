import { Router } from 'express';
import {
  scrapeCompany,
  refreshCompany,
  getPipelineStatus,
  triggerPipeline,
} from '../controllers/scraper.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { scrapeCompanySchema } from '../validators/scraper.validator';

const scraperRouter = Router();

// Pipeline progress status
scraperRouter.get('/pipeline/status', getPipelineStatus);

// Manually trigger pipeline ingestion
scraperRouter.post('/pipeline/trigger', triggerPipeline);

// Scrape a company from Screener.in by URL
scraperRouter.post('/company', validateRequest(scrapeCompanySchema), scrapeCompany);

// Refresh an already stored company's data
scraperRouter.post('/company/:id/refresh', refreshCompany);

export default scraperRouter;
export { scraperRouter };

