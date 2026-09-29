import { Router } from 'express';
import { getAllCompanies, getCompanyDetails } from '../controllers/company.controller';

const companyRouter = Router();

// Get all stored Indian companies with pagination, search, and sector filter
companyRouter.get('/', getAllCompanies);

// Get single company details by MongoDB ID or Stock Symbol
companyRouter.get('/:id', getCompanyDetails);

export default companyRouter;
export { companyRouter };
