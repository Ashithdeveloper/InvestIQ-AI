import { Router } from 'express';
import {
  getAllCompanies,
  searchCompaniesHandler,
  getSectors,
  getCompanyDetails,
  findAndScrapeCompanyHandler,
  liveSearchCompaniesHandler,
} from '../controllers/company.controller';

const companyRouter = Router();

// 1. Get unique sectors for frontend filtering
companyRouter.get('/sectors', getSectors);

// 2. Smooth live search across local DB and Screener.in autocomplete (?q=tata)
companyRouter.get('/live-search', liveSearchCompaniesHandler);

// 3. Search companies by name or symbol (?q=tata)
companyRouter.get('/search', searchCompaniesHandler);

// 4. Find and scrape any Indian company live from Screener.in with automatic AI/RAG ingestion
companyRouter.post('/find-and-scrape', findAndScrapeCompanyHandler);

// 5. Get all stored Indian companies with pagination, search, and sector filter
companyRouter.get('/', getAllCompanies);

// 6. Get complete company details by MongoDB ID or Stock Symbol
companyRouter.get('/:id', getCompanyDetails);

export default companyRouter;
export { companyRouter };
