import { Request, Response, NextFunction } from 'express';
import {
  getCompanies,
  searchCompanies,
  getAvailableSectors,
  getCompanyById,
  findOrScrapeCompany,
  liveSearchCompanies,
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

const findAndScrapeCompanyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({
        success: false,
        message: 'Search query or Screener.in URL is required',
        data: null,
      });
      return;
    }

    const result = await findOrScrapeCompany(query.trim());

    sendSuccess(
      res,
      result.isNew ? 201 : 200,
      result.message,
      result.company
    );
  } catch (error) {
    next(error);
  }
};

const liveSearchCompaniesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const results = await liveSearchCompanies(q);
    sendSuccess(res, 200, 'Live search results retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export {
  getAllCompanies,
  searchCompaniesHandler,
  getSectors,
  getCompanyDetails,
  findAndScrapeCompanyHandler,
  liveSearchCompaniesHandler,
};
