import request from 'supertest';
import app from '../src/app';
import Company, { ICompany } from '../src/models/Company.model';
import { calculateFinancialMetrics } from '../src/services/analysis.service';

describe('Financial Analysis Engine Tests', () => {
  let sampleCompany: ICompany;

  beforeEach(async () => {
    await Company.deleteMany({});

    sampleCompany = await Company.create({
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
            { metricName: 'Operating Profit', values: [53057, 59259, 64200] },
            { metricName: 'OPM %', values: [27.6, 26.3, 26.6] },
            { metricName: 'Net Profit', values: [38327, 42147, 46099] },
          ],
        },
        {
          statementType: 'BalanceSheet',
          reportingPeriods: ['Mar 2022', 'Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Share Capital', values: [366, 366, 366] },
            { metricName: 'Reserves', values: [88773, 90058, 90127] },
            { metricName: 'Borrowings', values: [7795, 7688, 7500] },
          ],
        },
        {
          statementType: 'CashFlow',
          reportingPeriods: ['Mar 2022', 'Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Cash from Operating Activity', values: [39949, 41961, 44341] },
            { metricName: 'Fixed assets purchased', values: [-2987, -3156, -3500] },
            { metricName: 'Free Cash Flow', values: [36962, 38805, 40841] },
          ],
        },
      ],
      dataSource: 'Screener.in',
      lastUpdated: new Date(),
    });
  });

  describe('Deterministic Financial Calculations', () => {
    it('should calculate Free Cash Flow (FCF) with reporting period', () => {
      const analysis = calculateFinancialMetrics(sampleCompany);

      expect(analysis.freeCashFlow.value).toBe(40841);
      expect(analysis.freeCashFlow.reportingPeriod).toBe('Mar 2024');
      expect(analysis.freeCashFlow.formula).toContain('Operating Cash Flow');
    });

    it('should calculate Return on Equity (ROE) using average equity', () => {
      const analysis = calculateFinancialMetrics(sampleCompany);

      // Equity 2023: 366 + 90058 = 90424
      // Equity 2024: 366 + 90127 = 90493
      // Avg Equity = (90424 + 90493) / 2 = 90458.5
      // Net Profit 2024 = 46099
      // ROE = (46099 / 90458.5) * 100 = 50.96%
      expect(analysis.returnOnEquity.value).toBe(50.96);
      expect(analysis.returnOnEquity.unit).toBe('%');
      expect(analysis.returnOnEquity.methodology).toContain('Average Shareholders');
      expect(analysis.returnOnEquity.reportingPeriod).toBe('Mar 2024');
    });

    it('should calculate Debt-to-Equity ratio correctly', () => {
      const analysis = calculateFinancialMetrics(sampleCompany);

      // Total Debt = 7500, Total Equity = 90493 -> 7500 / 90493 = 0.08
      expect(analysis.debtToEquity.value).toBe(0.08);
      expect(analysis.debtToEquity.reportingPeriod).toBe('Mar 2024');
    });

    it('should calculate YoY Revenue Growth and Profit Margins', () => {
      const analysis = calculateFinancialMetrics(sampleCompany);

      // YoY Revenue: (240893 - 225458) / 225458 * 100 = 6.85%
      expect(analysis.profitability.revenueGrowthYoY).toBe(6.85);

      // Net Profit Margin: 46099 / 240893 * 100 = 19.14%
      expect(analysis.profitability.netProfitMargin).toBe(19.14);
      expect(analysis.profitability.operatingProfitMargin).toBe(26.6);
    });

    it('should calculate 52-Week Range Growth', () => {
      const analysis = calculateFinancialMetrics(sampleCompany);

      // (3350 - 1976) / 1976 * 100 = 69.53%
      expect(analysis.marketCapGrowth.percentageGrowth).toBe(69.53);
      expect(analysis.marketCapGrowth.comparisonPeriod).toBe('52-Week Low to 52-Week High');
    });

    it('should handle missing financial statements gracefully without crashing', async () => {
      const emptyCompany = await Company.create({
        companyName: 'Minimal Co',
        symbol: 'MINIMAL',
        sector: 'Unknown',
        profileUrl: 'https://www.screener.in/company/MINIMAL/',
        exchange: ['NSE'],
        financialMetrics: {},
        financialStatements: [],
      });

      const analysis = calculateFinancialMetrics(emptyCompany);
      expect(analysis.freeCashFlow.value).toBeNull();
      expect(analysis.returnOnEquity.value).toBeNull();
      expect(analysis.debtToEquity.value).toBeNull();
      expect(analysis.profitability.revenueGrowthYoY).toBeNull();
    });

    it('should handle zero or negative equity appropriately', async () => {
      const distressedCompany = await Company.create({
        companyName: 'Distressed Co',
        symbol: 'DISTRESSED',
        sector: 'Metals',
        profileUrl: 'https://www.screener.in/company/DISTRESSED/',
        exchange: ['BSE'],
        financialStatements: [
          {
            statementType: 'BalanceSheet',
            reportingPeriods: ['Mar 2024'],
            rows: [
              { metricName: 'Share Capital', values: [100] },
              { metricName: 'Reserves', values: [-500] }, // Net equity = -400
              { metricName: 'Borrowings', values: [2000] },
            ],
          },
        ],
      });

      const analysis = calculateFinancialMetrics(distressedCompany);
      expect(analysis.debtToEquity.value).toBeNull();
      expect(analysis.debtToEquity.methodology).toContain('negative');
    });
  });

  describe('GET /api/analysis/company/:id', () => {
    it('should return deterministic financial analysis via API endpoint', async () => {
      const response = await request(app).get(
        `/api/analysis/company/${sampleCompany._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companyId).toBe(sampleCompany._id.toString());
      expect(response.body.data.symbol).toBe('TCS');
      expect(response.body.data.freeCashFlow.value).toBe(40841);
      expect(response.body.data.insights.length).toBeGreaterThan(0);
    });

    it('should return 404 for nonexistent company ID', async () => {
      const response = await request(app).get(
        '/api/analysis/company/507f1f77bcf86cd799439011'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
    });
  });
});
