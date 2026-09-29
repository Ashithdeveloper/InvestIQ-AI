import { isValidObjectId } from 'mongoose';
import Company, { ICompany } from '../models/Company.model';
import { ScrapedCompanyData, scrapeCompanyData } from './scraper.service';

export interface CompanyListResult {
  companies: ICompany[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const saveOrUpdateCompany = async (
  scrapedData: ScrapedCompanyData
): Promise<{ company: ICompany; isNew: boolean }> => {
  // Check if company already exists by symbol or profileUrl
  let company = await Company.findOne({
    $or: [{ symbol: scrapedData.symbol }, { profileUrl: scrapedData.profileUrl }],
  });

  const isNew = !company;

  if (!company) {
    company = new Company(scrapedData);
    await company.save();
    return { company, isNew: true };
  }

  // Preserve existing non-null financial values if new scrape yielded null
  const mergedFinancialMetrics = {
    revenue: scrapedData.financialMetrics.revenue ?? company.financialMetrics.revenue,
    netProfit: scrapedData.financialMetrics.netProfit ?? company.financialMetrics.netProfit,
    freeCashFlow:
      scrapedData.financialMetrics.freeCashFlow ?? company.financialMetrics.freeCashFlow,
    roe: scrapedData.financialMetrics.roe ?? company.financialMetrics.roe,
    roce: scrapedData.financialMetrics.roce ?? company.financialMetrics.roce,
    debtToEquity:
      scrapedData.financialMetrics.debtToEquity ?? company.financialMetrics.debtToEquity,
    peRatio: scrapedData.financialMetrics.peRatio ?? company.financialMetrics.peRatio,
    bookValue: scrapedData.financialMetrics.bookValue ?? company.financialMetrics.bookValue,
    dividendYield:
      scrapedData.financialMetrics.dividendYield ?? company.financialMetrics.dividendYield,
    opm: scrapedData.financialMetrics.opm ?? company.financialMetrics.opm,
    eps: scrapedData.financialMetrics.eps ?? company.financialMetrics.eps,
  };

  company.companyName = scrapedData.companyName || company.companyName;
  company.symbol = scrapedData.symbol || company.symbol;
  company.sector = scrapedData.sector !== 'Unknown' ? scrapedData.sector : company.sector;
  company.profileUrl = scrapedData.profileUrl || company.profileUrl;
  company.exchange = scrapedData.exchange.length > 0 ? scrapedData.exchange : company.exchange;
  company.marketCap = scrapedData.marketCap ?? company.marketCap;
  company.sharePrice = scrapedData.sharePrice ?? company.sharePrice;
  company.high52Week = scrapedData.high52Week ?? company.high52Week;
  company.low52Week = scrapedData.low52Week ?? company.low52Week;
  company.financialMetrics = mergedFinancialMetrics;

  if (scrapedData.financialStatements.length > 0) {
    company.financialStatements = scrapedData.financialStatements;
  }

  company.lastUpdated = new Date();
  company.dataSource = scrapedData.dataSource || 'Screener.in';

  await company.save();
  return { company, isNew: false };
};

const getCompanies = async (query: {
  page: number;
  limit: number;
  search?: string;
  sector?: string;
}): Promise<CompanyListResult> => {
  const { page, limit, search, sector } = query;
  const filter: Record<string, unknown> = {};

  if (search && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { companyName: { $regex: escaped, $options: 'i' } },
      { symbol: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (sector && sector.trim()) {
    const escaped = sector.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.sector = { $regex: `^${escaped}$`, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    Company.find(filter)
      .sort({ marketCap: -1, companyName: 1 })
      .skip(skip)
      .limit(limit),
    Company.countDocuments(filter),
  ]);

  return {
    companies,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getCompanyById = async (id: string): Promise<ICompany> => {
  let company: ICompany | null = null;

  if (isValidObjectId(id)) {
    company = await Company.findById(id);
  }

  if (!company) {
    // Also support finding by uppercase symbol (e.g. TCS, RELIANCE)
    company = await Company.findOne({ symbol: id.toUpperCase().trim() });
  }

  if (!company) {
    const error = new Error('Company not found') as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  return company;
};

const refreshCompanyData = async (id: string): Promise<ICompany> => {
  const company = await getCompanyById(id);

  const freshScrapedData = await scrapeCompanyData(company.profileUrl);
  const { company: updatedCompany } = await saveOrUpdateCompany(freshScrapedData);

  return updatedCompany;
};

export {
  saveOrUpdateCompany,
  getCompanies,
  getCompanyById,
  refreshCompanyData,
};
