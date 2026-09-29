import request from 'supertest';
import app from '../src/app';
import Company from '../src/models/Company.model';
import { saveOrUpdateCompany } from '../src/services/company.service';
import { ScrapedCompanyData } from '../src/services/scraper.service';

describe('Company Service & API Tests', () => {
  const sampleTcsData: ScrapedCompanyData = {
    companyName: 'Tata Consultancy Services Ltd',
    symbol: 'TCS',
    sector: 'Information Technology',
    profileUrl: 'https://www.screener.in/company/TCS/consolidated/',
    exchange: ['NSE', 'BSE'],
    marketCap: 734985,
    sharePrice: 2032,
    high52Week: 3350,
    low52Week: 1976,
    financialMetrics: {
      revenue: 240893,
      netProfit: 46099,
      freeCashFlow: 38500,
      roe: 51.8,
      roce: 63.0,
      debtToEquity: 0.08,
      peRatio: 13.7,
      bookValue: 296,
      dividendYield: 3.15,
      opm: 26.2,
      eps: 125.4,
    },
    financialStatements: [
      {
        statementType: 'ProfitAndLoss',
        reportingPeriods: ['Mar 2022', 'Mar 2023', 'Mar 2024'],
        rows: [
          { metricName: 'Sales', values: [191754, 225458, 240893] },
          { metricName: 'Net Profit', values: [38327, 42147, 46099] },
        ],
      },
    ],
    dataSource: 'Screener.in',
    lastUpdated: new Date(),
  };

  const sampleInfyData: ScrapedCompanyData = {
    companyName: 'Infosys Ltd',
    symbol: 'INFY',
    sector: 'Information Technology',
    profileUrl: 'https://www.screener.in/company/INFY/consolidated/',
    exchange: ['NSE', 'BSE'],
    marketCap: 615000,
    sharePrice: 1480,
    high52Week: 1900,
    low52Week: 1350,
    financialMetrics: {
      revenue: 153670,
      netProfit: 26233,
      freeCashFlow: 21000,
      roe: 32.1,
      roce: 40.5,
      debtToEquity: 0.1,
      peRatio: 23.4,
      bookValue: 210,
      dividendYield: 2.8,
      opm: 24.1,
      eps: 63.5,
    },
    financialStatements: [],
    dataSource: 'Screener.in',
    lastUpdated: new Date(),
  };

  const sampleRelianceData: ScrapedCompanyData = {
    companyName: 'Reliance Industries Ltd',
    symbol: 'RELIANCE',
    sector: 'Energy & Petrochemicals',
    profileUrl: 'https://www.screener.in/company/RELIANCE/consolidated/',
    exchange: ['NSE', 'BSE'],
    marketCap: 1950000,
    sharePrice: 2890,
    high52Week: 3100,
    low52Week: 2200,
    financialMetrics: {
      revenue: 890000,
      netProfit: 69000,
      freeCashFlow: 35000,
      roe: 9.8,
      roce: 10.5,
      debtToEquity: 0.42,
      peRatio: 28.2,
      bookValue: 1200,
      dividendYield: 0.35,
      opm: 17.5,
      eps: 102.3,
    },
    financialStatements: [],
    dataSource: 'Screener.in',
    lastUpdated: new Date(),
  };

  beforeEach(async () => {
    await Company.deleteMany({});
  });

  describe('Company Save & Update (Upsert & Duplicate Prevention)', () => {
    it('should save a new company record successfully', async () => {
      const { company, isNew } = await saveOrUpdateCompany(sampleTcsData);

      expect(isNew).toBe(true);
      expect(company._id).toBeDefined();
      expect(company.symbol).toBe('TCS');
      expect(company.companyName).toBe('Tata Consultancy Services Ltd');
      expect(company.financialMetrics.roe).toBe(51.8);
      expect(company.financialStatements.length).toBe(1);
    });

    it('should update existing record and avoid creating duplicate records', async () => {
      // First save
      await saveOrUpdateCompany(sampleTcsData);
      expect(await Company.countDocuments()).toBe(1);

      // Second save with updated price and fresh metrics
      const updatedTcsData: ScrapedCompanyData = {
        ...sampleTcsData,
        sharePrice: 2150,
        financialMetrics: {
          ...sampleTcsData.financialMetrics,
          roe: 53.0,
        },
      };

      const { company, isNew } = await saveOrUpdateCompany(updatedTcsData);

      expect(isNew).toBe(false);
      expect(await Company.countDocuments()).toBe(1);
      expect(company.sharePrice).toBe(2150);
      expect(company.financialMetrics.roe).toBe(53.0);
    });

    it('should preserve valid stored financial metrics if new scrape contains nulls', async () => {
      await saveOrUpdateCompany(sampleTcsData);

      // Scrape update where roe is temporarily null/unavailable
      const dataWithNullRoe: ScrapedCompanyData = {
        ...sampleTcsData,
        financialMetrics: {
          ...sampleTcsData.financialMetrics,
          roe: null,
        },
      };

      const { company } = await saveOrUpdateCompany(dataWithNullRoe);
      // Stored ROE should remain preserved from previous valid record
      expect(company.financialMetrics.roe).toBe(51.8);
    });
  });

  describe('GET /api/companies (Search, Filter, Pagination)', () => {
    beforeEach(async () => {
      await saveOrUpdateCompany(sampleTcsData);
      await saveOrUpdateCompany(sampleInfyData);
      await saveOrUpdateCompany(sampleRelianceData);
    });

    it('should return all companies with pagination metadata', async () => {
      const response = await request(app).get('/api/companies?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companies.length).toBe(2);
      expect(response.body.data.pagination).toEqual({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });

    it('should search companies by name case-insensitively', async () => {
      const response = await request(app).get('/api/companies?search=tata');

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(1);
      expect(response.body.data.companies[0].symbol).toBe('TCS');
    });

    it('should search companies by symbol', async () => {
      const response = await request(app).get('/api/companies?search=INFY');

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(1);
      expect(response.body.data.companies[0].companyName).toBe('Infosys Ltd');
    });

    it('should filter companies by sector', async () => {
      const response = await request(app).get(
        '/api/companies?sector=Information Technology'
      );

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(2);
      expect(
        response.body.data.companies.every(
          (c: { sector: string }) => c.sector === 'Information Technology'
        )
      ).toBe(true);
    });

    it('should return empty list when no matches are found', async () => {
      const response = await request(app).get('/api/companies?search=NonExistentCompany');

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/companies/:id', () => {
    let tcsId: string;

    beforeEach(async () => {
      const { company } = await saveOrUpdateCompany(sampleTcsData);
      tcsId = company._id.toString();
    });

    it('should retrieve company details by MongoDB ObjectId', async () => {
      const response = await request(app).get(`/api/companies/${tcsId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companyName).toBe('Tata Consultancy Services Ltd');
      expect(response.body.data.symbol).toBe('TCS');
      expect(response.body.data.financialMetrics.roe).toBe(51.8);
      expect(response.body.data.lastUpdated).toBeDefined();
    });

    it('should retrieve company details by Stock Symbol', async () => {
      const response = await request(app).get('/api/companies/TCS');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('TCS');
    });

    it('should return 404 when company does not exist', async () => {
      const response = await request(app).get('/api/companies/UNKNOWN_SYMBOL_99');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
    });
  });
});
