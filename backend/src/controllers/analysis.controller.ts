import { Request, Response, NextFunction } from 'express';
import { getCompanyById } from '../services/company.service';
import { calculateFinancialMetrics } from '../services/analysis.service';
import { getMultiTimeframeChartData } from '../services/marketData.service';
import { sendSuccess } from '../utils/apiResponse';

const getCompanyAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const company = await getCompanyById(id);
    const analysis = calculateFinancialMetrics(company);

    // Fetch real multi-timeframe market chart data (1D, 5D, 1M, 6M, 1Y)
    try {
      const marketData = await getMultiTimeframeChartData(company.symbol, company.sharePrice);
      if (marketData && marketData.timeframes) {
        analysis.pricePerformance = {
          currentPrice: marketData.currentPrice || company.sharePrice,
          high52Week: company.high52Week,
          low52Week: company.low52Week,
          timeframes: marketData.timeframes,
          threeMonthChangePercent: marketData.timeframes['1M']?.changePercent,
          threeMonthHigh: marketData.timeframes['1M']?.high,
          threeMonthLow: marketData.timeframes['1M']?.low,
          history3Month: marketData.timeframes['1M']?.points,
        };
      }
    } catch {
      // Fallback already pre-populated by calculateFinancialMetrics
    }

    sendSuccess(res, 200, 'Company financial analysis calculated successfully', analysis);
  } catch (error) {
    next(error);
  }
};

export { getCompanyAnalysis };
