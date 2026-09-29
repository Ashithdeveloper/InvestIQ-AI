import { Request, Response, NextFunction } from 'express';
import { scrapeCompanyData } from '../services/scraper.service';
import { saveOrUpdateCompany, refreshCompanyData } from '../services/company.service';
import { getIngestionProgress, runIngestionPipeline } from '../services/ingestion.pipeline';
import { sendSuccess } from '../utils/apiResponse';

const scrapeCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { url } = req.body;
    const scrapedData = await scrapeCompanyData(url);
    const { company, isNew } = await saveOrUpdateCompany(scrapedData);

    sendSuccess(
      res,
      isNew ? 201 : 200,
      isNew
        ? 'Company financial data scraped and stored successfully'
        : 'Company financial data scraped and updated successfully',
      {
        isNew,
        company,
      }
    );
  } catch (error) {
    next(error);
  }
};

const refreshCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const updatedCompany = await refreshCompanyData(id);

    sendSuccess(
      res,
      200,
      'Company financial data refreshed successfully',
      updatedCompany
    );
  } catch (error) {
    next(error);
  }
};

const getPipelineStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const progress = getIngestionProgress();
    sendSuccess(res, 200, 'Ingestion pipeline status retrieved successfully', progress);
  } catch (error) {
    next(error);
  }
};

const triggerPipeline = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Non-blocking trigger
    setImmediate(() => {
      runIngestionPipeline().catch((err) => {
        console.error('[Pipeline] Trigger error:', err);
      });
    });

    sendSuccess(res, 202, 'Ingestion pipeline initiated in background', {
      started: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export { scrapeCompany, refreshCompany, getPipelineStatus, triggerPipeline };

