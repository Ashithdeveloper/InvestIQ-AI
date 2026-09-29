import { Request, Response, NextFunction } from 'express';
import { getCompanies, getCompanyById } from '../services/company.service';
import { getCompaniesQuerySchema } from '../validators/scraper.validator';
import { sendSuccess } from '../utils/apiResponse';

const getAllCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getCompaniesQuerySchema.parse(req.query);
    const result = await getCompanies(validatedQuery);

    sendSuccess(res, 200, 'Companies retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getCompanyDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const company = await getCompanyById(id);

    sendSuccess(res, 200, 'Company details retrieved successfully', company);
  } catch (error) {
    next(error);
  }
};

export { getAllCompanies, getCompanyDetails };
