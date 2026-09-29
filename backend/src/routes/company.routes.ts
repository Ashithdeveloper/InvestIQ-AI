import { Router } from 'express';
import {
  getAllCompanies,
  searchCompaniesHandler,
  getSectors,
  getCompanyDetails,
} from '../controllers/company.controller';

const companyRouter = Router();

// 1. Get unique sectors for frontend filtering
companyRouter.get('/sectors', getSectors);

// 2. Search companies by name or symbol (?q=tata)
companyRouter.get('/search', searchCompaniesHandler);

// 3. Get all stored Indian companies with pagination, search, and sector filter
companyRouter.get('/', getAllCompanies);

// 4. Get complete company details by MongoDB ID or Stock Symbol
companyRouter.get('/:id', getCompanyDetails);

export default companyRouter;
export { companyRouter };
