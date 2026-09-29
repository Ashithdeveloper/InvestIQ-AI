import request from 'supertest';
import app from '../src/app';
import Company from '../src/models/Company.model';
import * as scraperService from '../src/services/scraper.service';

describe('Scraper API & Service Tests', () => {
  const mockScrapedTcs: scraperService.ScrapedCompanyData = {
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
        reportingPeriods: ['Mar 2023', 'Mar 2024'],
        rows: [
          { metricName: 'Sales', values: [225458, 240893] },
          { metricName: 'Net Profit', values: [42147, 46099] },
        ],
      },
    ],
    dataSource: 'Screener.in',
    lastUpdated: new Date(),
  };

  beforeEach(async () => {
    await Company.deleteMany({});
    jest.restoreAllMocks();
  });

  describe('POST /api/scraper/company - Validation', () => {
    it('should reject requests with missing URL', async () => {
      const response = await request(app).post('/api/scraper/company').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject URLs that do not belong to Screener.in Indian companies', async () => {
      const response = await request(app)
        .post('/api/scraper/company')
        .send({ url: 'https://finance.yahoo.com/quote/AAPL' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].message).toContain('Screener.in');
    });

    it('should reject invalid URL strings', async () => {
      const response = await request(app)
        .post('/api/scraper/company')
        .send({ url: 'not-a-valid-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/scraper/company - Scraping Execution', () => {
    it('should scrape company data, store it in MongoDB, and return 201 Created', async () => {
      jest
        .spyOn(scraperService, 'scrapeCompanyData')
        .mockResolvedValueOnce(mockScrapedTcs);

      const response = await request(app).post('/api/scraper/company').send({
        url: 'https://www.screener.in/company/TCS/consolidated/',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isNew).toBe(true);
      expect(response.body.data.company.symbol).toBe('TCS');
      expect(response.body.data.company.companyName).toBe(
        'Tata Consultancy Services Ltd'
      );
      expect(response.body.data.company.financialMetrics.roe).toBe(51.8);

      // Verify stored in MongoDB
      const stored = await Company.findOne({ symbol: 'TCS' });
      expect(stored).not.toBeNull();
      expect(stored?.marketCap).toBe(734985);
    });

    it('should update existing record and return 200 when scraping an already stored company', async () => {
      jest
        .spyOn(scraperService, 'scrapeCompanyData')
        .mockResolvedValue(mockScrapedTcs);

      // First scrape
      await request(app).post('/api/scraper/company').send({
        url: 'https://www.screener.in/company/TCS/consolidated/',
      });

      // Second scrape (re-scrape)
      const secondResponse = await request(app).post('/api/scraper/company').send({
        url: 'https://www.screener.in/company/TCS/consolidated/',
      });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.data.isNew).toBe(false);
      expect(await Company.countDocuments()).toBe(1);
    });

    it('should handle scraper timeouts gracefully without crashing', async () => {
      const timeoutError = new Error(
        'Request to Screener.in timed out. Please verify your internet connection or the target URL.'
      ) as Error & { statusCode: number };
      timeoutError.statusCode = 504;

      jest
        .spyOn(scraperService, 'scrapeCompanyData')
        .mockRejectedValueOnce(timeoutError);

      const response = await request(app).post('/api/scraper/company').send({
        url: 'https://www.screener.in/company/TCS/consolidated/',
      });

      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('timed out');
    });
  });

  describe('POST /api/scraper/company/:id/refresh', () => {
    it('should refresh an existing company data and return updated document', async () => {
      // Create initial company record
      const initial = await Company.create(mockScrapedTcs);

      const freshData: scraperService.ScrapedCompanyData = {
        ...mockScrapedTcs,
        sharePrice: 2100,
        financialMetrics: {
          ...mockScrapedTcs.financialMetrics,
          roe: 55.0,
        },
      };

      jest
        .spyOn(scraperService, 'scrapeCompanyData')
        .mockResolvedValueOnce(freshData);

      const response = await request(app).post(
        `/api/scraper/company/${initial._id}/refresh`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('refreshed successfully');
      expect(response.body.data.sharePrice).toBe(2100);
      expect(response.body.data.financialMetrics.roe).toBe(55.0);

      // Verify DB updated
      const updated = await Company.findById(initial._id);
      expect(updated?.sharePrice).toBe(2100);
    });

    it('should return 404 when attempting to refresh a non-existent company', async () => {
      const response = await request(app).post(
        '/api/scraper/company/507f1f77bcf86cd799439011/refresh'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
    });
  });
});
