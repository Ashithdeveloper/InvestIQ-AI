import { isValidObjectId } from 'mongoose';
import Company, { ICompany } from '../models/Company.model';
import {
  ScrapedCompanyData,
  scrapeCompanyData,
  searchAndResolveScreenerCompany,
  searchScreenerSuggestions,
} from './scraper.service';
import { ingestCompanyFinancials } from './rag/ingestion/ingestion.service';

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
  q?: string;
  sector?: string;
}): Promise<CompanyListResult> => {
  const { page, limit, sector } = query;
  const searchTerm = (query.search || query.q || '').trim();
  const filter: Record<string, unknown> = {};

  if (searchTerm) {
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      .select('-financialStatements')
      .sort({ companyName: 1 })
      .skip(skip)
      .limit(limit),
    Company.countDocuments(filter),
  ]);

  return {
    companies,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const searchCompanies = async (query: {
  q?: string;
  page: number;
  limit: number;
}): Promise<CompanyListResult> => {
  const { page, limit } = query;
  const searchTerm = (query.q || '').trim();

  if (!searchTerm) {
    return {
      companies: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = {
    $or: [
      { companyName: { $regex: escaped, $options: 'i' } },
      { symbol: { $regex: escaped, $options: 'i' } },
    ],
  };

  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    Company.find(filter)
      .select('-financialStatements')
      .sort({ companyName: 1 })
      .skip(skip)
      .limit(limit),
    Company.countDocuments(filter),
  ]);

  return {
    companies,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const getAvailableSectors = async (): Promise<string[]> => {
  const sectors = await Company.distinct('sector', {
    sector: { $nin: [null, '', 'Unknown'] },
  });

  const validSectors = sectors
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0 && s !== 'Unknown')
    .map((s) => s.trim());

  // Deduplicate case-insensitively and sort alphabetically
  const uniqueSectors = Array.from(new Set(validSectors));
  uniqueSectors.sort((a, b) => a.localeCompare(b));

  return uniqueSectors;
};

const getCompanyById = async (id: string): Promise<ICompany> => {
  let company: ICompany | null = null;
  const trimmedId = id.trim();

  if (isValidObjectId(trimmedId)) {
    company = await Company.findById(trimmedId);
  }

  if (!company) {
    // Also support finding by uppercase symbol (e.g. TCS, RELIANCE)
    company = await Company.findOne({ symbol: trimmedId.toUpperCase() });
  }

  if (!company) {
    const error = new Error('Company not found') as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  return company;
};

const findOrScrapeCompany = async (
  query: string
): Promise<{ company: ICompany; isNew: boolean; message: string }> => {
  const trimmed = query.trim();

  // 1. Check if already stored in MongoDB (case-insensitive symbol or regex name match)
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Company.findOne({
      $or: [
        { symbol: trimmed.toUpperCase() },
        { companyName: new RegExp(`^${escaped}$`, 'i') },
      ],
    });

    if (existing && existing.sharePrice !== null && existing.sharePrice !== undefined) {
      return {
        company: existing,
        isNew: false,
        message: 'Stock found in verified database',
      };
    }
  }

  // 2. Resolve Screener URL and canonical symbol
  const resolved = await searchAndResolveScreenerCompany(trimmed);

  // Check MongoDB again with resolved symbol and profileUrl
  const existingByResolved = await Company.findOne({
    $or: [{ symbol: resolved.symbol.toUpperCase() }, { profileUrl: resolved.url }],
  });

  if (
    existingByResolved &&
    existingByResolved.sharePrice !== null &&
    existingByResolved.sharePrice !== undefined
  ) {
    return {
      company: existingByResolved,
      isNew: false,
      message: 'Stock found in verified database',
    };
  }

  // 3. Scrape company from Screener.in
  const scrapedData = await scrapeCompanyData(resolved.url, resolved.symbol);
  const { company: savedCompany, isNew } = await saveOrUpdateCompany(scrapedData);

  // 4. Ingest financial documents into vector store for RAG & AI analysis
  try {
    await ingestCompanyFinancials(savedCompany._id.toString());
  } catch (ragErr) {
    console.warn(`[Find & Scrape] Vector ingestion skipped for ${savedCompany.symbol}:`, ragErr);
  }

  return {
    company: savedCompany,
    isNew,
    message: isNew
      ? `Stock ${savedCompany.symbol} successfully scraped and analyzed!`
      : `Stock ${savedCompany.symbol} data refreshed!`,
  };
};

const refreshCompanyData = async (id: string): Promise<ICompany> => {
  const company = await getCompanyById(id);

  const freshScrapedData = await scrapeCompanyData(company.profileUrl);
  const { company: updatedCompany } = await saveOrUpdateCompany(freshScrapedData);

  return updatedCompany;
};

export interface LiveSearchResultItem {
  id: string;
  name: string;
  symbol: string;
  sector?: string;
  sharePrice?: number | null;
  inDatabase: boolean;
  companyId?: string;
  url?: string;
}

const liveSearchCompanies = async (query: string): Promise<LiveSearchResultItem[]> => {
  const q = (query || '').trim();
  if (!q) return [];

  // 1. Local database fast search
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const localMatches = await Company.find({
    $or: [
      { symbol: { $regex: `^${escaped}`, $options: 'i' } },
      { companyName: { $regex: escaped, $options: 'i' } },
      { symbol: { $regex: escaped, $options: 'i' } },
    ],
  })
    .select('symbol companyName sector sharePrice _id')
    .limit(6);

  const localMap = new Set(localMatches.map((c) => c.symbol.toUpperCase()));

  const results: LiveSearchResultItem[] = localMatches.map((c) => ({
    id: c._id.toString(),
    companyId: c._id.toString(),
    symbol: c.symbol,
    name: c.companyName,
    sector: c.sector,
    sharePrice: c.sharePrice,
    inDatabase: true,
  }));

  // 2. Screener.in live search autocomplete suggestions
  try {
    const screenerMatches = await searchScreenerSuggestions(q);
    for (const item of screenerMatches) {
      const symUpper = item.symbol.toUpperCase();
      if (!localMap.has(symUpper)) {
        results.push({
          id: `screener-${item.id}`,
          symbol: symUpper,
          name: item.name,
          inDatabase: false,
          url: item.url,
        });
        localMap.add(symUpper);
      }
    }
  } catch {
    // If external call fails, return local matches smoothly
  }

  return results.slice(0, 10);
};

export {
  saveOrUpdateCompany,
  getCompanies,
  searchCompanies,
  getAvailableSectors,
  getCompanyById,
  refreshCompanyData,
  findOrScrapeCompany,
  liveSearchCompanies,
};
