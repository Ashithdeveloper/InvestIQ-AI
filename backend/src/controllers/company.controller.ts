import { Request, Response, NextFunction } from 'express';
import {
  getCompanies,
  searchCompanies,
  getAvailableSectors,
  getCompanyById,
} from '../services/company.service';
import {
  getCompaniesQuerySchema,
  searchCompaniesQuerySchema,
} from '../validators/company.validator';
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

const searchCompaniesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = searchCompaniesQuerySchema.parse(req.query);
    const result = await searchCompanies({
      q: validatedQuery.q || validatedQuery.search,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
    });

    sendSuccess(res, 200, 'Companies retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getSectors = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sectors = await getAvailableSectors();
    sendSuccess(res, 200, 'Sectors retrieved successfully', sectors);
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

export {
  getAllCompanies,
  searchCompaniesHandler,
  getSectors,
  getCompanyDetails,
};
