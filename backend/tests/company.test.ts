import request from 'supertest';
import app from '../src/app';
import Company from '../src/models/Company.model';
import { saveOrUpdateCompany } from '../src/services/company.service';
import { ScrapedCompanyData } from '../src/services/scraper.service';

describe('Company Exploration & Details API Tests', () => {
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

  describe('GET /api/companies - All Companies & Pagination', () => {
    it('should return empty list and zero total when database is empty', async () => {
      const response = await request(app).get('/api/companies');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companies).toEqual([]);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('should return companies sorted by company name alphabetically by default', async () => {
      await saveOrUpdateCompany(sampleTcsData);
      await saveOrUpdateCompany(sampleInfyData);
      await saveOrUpdateCompany(sampleRelianceData);

      const response = await request(app).get('/api/companies');

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(3);
      // Infosys Ltd, Reliance Industries Ltd, Tata Consultancy Services Ltd
      expect(response.body.data.companies[0].symbol).toBe('INFY');
      expect(response.body.data.companies[1].symbol).toBe('RELIANCE');
      expect(response.body.data.companies[2].symbol).toBe('TCS');
    });

    it('should exclude heavy financialStatements in list projection', async () => {
      await saveOrUpdateCompany(sampleTcsData);

      const response = await request(app).get('/api/companies');

      expect(response.status).toBe(200);
      const company = response.body.data.companies[0];
      expect(company.companyName).toBe('Tata Consultancy Services Ltd');
      expect(company.financialStatements).toBeUndefined();
    });

    it('should support pagination with page and limit parameters', async () => {
      await saveOrUpdateCompany(sampleTcsData);
      await saveOrUpdateCompany(sampleInfyData);
      await saveOrUpdateCompany(sampleRelianceData);

      const response = await request(app).get('/api/companies?page=2&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(1);
      expect(response.body.data.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('should sanitize invalid pagination parameters safely', async () => {
      await saveOrUpdateCompany(sampleTcsData);

      const response = await request(app).get('/api/companies?page=-5&limit=-20');

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });
  });

  describe('GET /api/companies/search - Search Endpoint', () => {
    beforeEach(async () => {
      await saveOrUpdateCompany(sampleTcsData);
      await saveOrUpdateCompany(sampleInfyData);
      await saveOrUpdateCompany(sampleRelianceData);
    });

    it('should search companies by name with partial matching (?q=tata)', async () => {
      const response = await request(app).get('/api/companies/search?q=tata');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companies.length).toBe(1);
      expect(response.body.data.companies[0].symbol).toBe('TCS');
    });

    it('should search companies by stock symbol (?q=INFY)', async () => {
      const response = await request(app).get('/api/companies/search?q=infy');

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(1);
      expect(response.body.data.companies[0].companyName).toBe('Infosys Ltd');
    });

    it('should handle empty search queries gracefully by returning empty array', async () => {
      const response = await request(app).get('/api/companies/search?q=');

      expect(response.status).toBe(200);
      expect(response.body.data.companies).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should support pagination on search results', async () => {
      const response = await request(app).get('/api/companies/search?q=Ltd&limit=1&page=1');

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(1);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.totalPages).toBe(3);
    });
  });

  describe('GET /api/companies?sector=... - Sector Filtering & Combined Queries', () => {
    beforeEach(async () => {
      await saveOrUpdateCompany(sampleTcsData);
      await saveOrUpdateCompany(sampleInfyData);
      await saveOrUpdateCompany(sampleRelianceData);
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

    it('should support combining search and sector filter', async () => {
      const response = await request(app).get(
        '/api/companies?sector=Information Technology&search=tata'
      );

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(1);
      expect(response.body.data.companies[0].symbol).toBe('TCS');
    });

    it('should return empty list when sector and search have no intersection', async () => {
      const response = await request(app).get(
        '/api/companies?sector=Energy & Petrochemicals&search=infy'
      );

      expect(response.status).toBe(200);
      expect(response.body.data.companies.length).toBe(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/companies/sectors - Available Sectors Endpoint', () => {
    it('should return sorted unique list of company sectors', async () => {
      await saveOrUpdateCompany(sampleTcsData);
      await saveOrUpdateCompany(sampleInfyData);
      await saveOrUpdateCompany(sampleRelianceData);

      const response = await request(app).get('/api/companies/sectors');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Sectors retrieved successfully');
      expect(response.body.data).toEqual([
        'Energy & Petrochemicals',
        'Information Technology',
      ]);
    });

    it('should return empty array when no sectors exist in database', async () => {
      const response = await request(app).get('/api/companies/sectors');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/companies/:id - Company Details', () => {
    let tcsId: string;

    beforeEach(async () => {
      const { company } = await saveOrUpdateCompany(sampleTcsData);
      tcsId = company._id.toString();
    });

    it('should retrieve complete company profile by MongoDB ObjectId', async () => {
      const response = await request(app).get(`/api/companies/${tcsId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companyName).toBe('Tata Consultancy Services Ltd');
      expect(response.body.data.symbol).toBe('TCS');
      expect(response.body.data.exchange).toEqual(['NSE', 'BSE']);
      expect(response.body.data.financialMetrics.roe).toBe(51.8);
      expect(response.body.data.financialMetrics.debtToEquity).toBe(0.08);
      expect(response.body.data.financialStatements.length).toBe(1);
      expect(response.body.data.dataSource).toBe('Screener.in');
      expect(response.body.data.lastUpdated).toBeDefined();
    });

    it('should retrieve company profile by Stock Symbol case-insensitively', async () => {
      const response = await request(app).get('/api/companies/tcs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('TCS');
    });

    it('should return 404 when company does not exist', async () => {
      const response = await request(app).get('/api/companies/NONEXISTENT_99');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
    });

    it('should return 404 for invalid ObjectId format safely without crashing', async () => {
      const response = await request(app).get('/api/companies/123-invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
    });
  });
});
