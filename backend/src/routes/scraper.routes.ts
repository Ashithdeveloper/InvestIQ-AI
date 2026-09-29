import { Router } from 'express';
import {
  scrapeCompany,
  refreshCompany,
  getPipelineStatus,
  triggerPipeline,
  findAndScrapeStock,
} from '../controllers/scraper.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { scrapeCompanySchema } from '../validators/scraper.validator';

const scraperRouter = Router();

// Pipeline progress status
scraperRouter.get('/pipeline/status', getPipelineStatus);

// Manually trigger pipeline ingestion
scraperRouter.post('/pipeline/trigger', triggerPipeline);

// Find and scrape any stock by symbol, name, or Screener URL with automatic RAG indexing
scraperRouter.post('/find-and-scrape', findAndScrapeStock);

// Scrape a company from Screener.in by URL
scraperRouter.post('/company', validateRequest(scrapeCompanySchema), scrapeCompany);

// Refresh an already stored company's data
scraperRouter.post('/company/:id/refresh', refreshCompany);

export default scraperRouter;
export { scraperRouter };

