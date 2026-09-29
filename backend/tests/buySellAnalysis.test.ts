import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import Company from '../src/models/Company.model';
import User from '../src/models/User.model';
import { generateToken } from '../src/utils/jwt';

describe('Task 2: Backend AI Buy Analysis & AI Sell Analysis APIs', () => {
  let companyId: string;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Create test user with financial profile
    const user = await User.create({
      username: 'rohansharma',
      email: 'rohan.sharma@example.com',
      passwordHash: 'hashed_test_password_123',
      financialProfile: {
        age: 28,
        monthlySalary: 120000,
        monthlyInvestmentBudget: 25000,
        isCompleted: true,
      },
    });

    userId = user._id.toString();
    authToken = generateToken({
      userId,
      email: user.email,
    });


    // Create test company with comprehensive metrics & statements
    const company = await Company.create({
      companyName: 'Tata Consultancy Services Ltd',
      symbol: 'TCS',
      sector: 'IT - Software',
      profileUrl: 'https://www.screener.in/company/TCS/consolidated/',
      exchange: ['NSE', 'BSE'],
      sharePrice: 3850,
      marketCap: 1400000,
      high52Week: 4200,
      low52Week: 3200,
      financialMetrics: {
        revenue: 240000,
        netProfit: 46000,
        freeCashFlow: 42000,
        roe: 48.5,
        roce: 62.1,
        debtToEquity: 0.05,
        peRatio: 30.5,
        bookValue: 275,
        dividendYield: 1.8,
        opm: 26.5,
        eps: 125.4,
      },
      financialStatements: [
        {
          statementType: 'ProfitAndLoss',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Sales', values: [225000, 240000] },
            { metricName: 'Net Profit', values: [42000, 46000] },
            { metricName: 'OPM %', values: [25, 26.5] },
          ],
        },
        {
          statementType: 'CashFlow',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Cash from Operating Activity', values: [45000, 48000] },
            { metricName: 'Cash from Investing Activity', values: [-5000, -6000] },
          ],
        },
        {
          statementType: 'BalanceSheet',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Borrowings', values: [8000, 7500] },
            { metricName: 'Other Liabilities', values: [40000, 42000] },
            { metricName: 'Total Liabilities', values: [120000, 135000] },
          ],
        },
      ],
      dataSource: 'Screener.in',
      ingestionStatus: 'completed',
    });
    companyId = company._id.toString();
  });

  // ── 1. POST /api/ai/buy-analysis ─────────────────────────────────────────
  describe('1. POST /api/ai/buy-analysis', () => {
    it('should generate structured buy analysis by MongoDB ID', async () => {
      const res = await request(app)
        .post('/api/ai/buy-analysis')
        .send({ companyId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('Tata Consultancy Services Ltd');
      expect(res.body.data.stockSymbol).toBe('TCS');
      expect(res.body.data.latestAvailablePrice).toBe(3850);
      expect(Array.isArray(res.body.data.financialStrengths)).toBe(true);
      expect(res.body.data.financialStrengths.length).toBeGreaterThan(0);
      expect(res.body.data.profitabilityAnalysis).toHaveProperty('revenueGrowthYoY');
      expect(res.body.data.valuationAnalysis).toHaveProperty('peRatio');
      expect(res.body.data.historicalPerformance).toHaveProperty('high52Week', 4200);
      expect(res.body.data.historicalPerformance).toHaveProperty('low52Week', 3200);
      expect(res.body.data.aiGeneratedExplanation).toBeTruthy();
      expect(res.body.data.disclaimer).toContain('NOT a recommendation');
    });

    it('should generate buy analysis by stock symbol (TCS)', async () => {
      const res = await request(app)
        .post('/api/ai/buy-analysis')
        .send({ companyId: 'TCS' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stockSymbol).toBe('TCS');
    });

    it('should calculate hypothetical scenarios when investmentAmount and duration are provided', async () => {
      const res = await request(app)
        .post('/api/ai/buy-analysis')
        .send({
          companyId,
          investmentAmount: 50000,
          investmentDuration: '3 years',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.hypotheticalScenarios).not.toBeNull();
      expect(Array.isArray(res.body.data.hypotheticalScenarios)).toBe(true);
      expect(res.body.data.hypotheticalScenarios.length).toBe(4);

      const scenario = res.body.data.hypotheticalScenarios[0];
      expect(scenario).toHaveProperty('scenarioName');
      expect(scenario).toHaveProperty('purchasableShares');
      expect(scenario).toHaveProperty('investedCapital');
      expect(scenario).toHaveProperty('unallocatedCash');
      expect(scenario).toHaveProperty('projectedValue');
    });

    it('should include user financial profile budget context when authenticated', async () => {
      const res = await request(app)
        .post('/api/ai/buy-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ companyId });

      expect(res.status).toBe(200);
      expect(res.body.data.budgetContext).not.toBeNull();
      expect(res.body.data.budgetContext.monthlyBudget).toBe(25000);
      expect(res.body.data.budgetContext.purchasableShares).toBe(6); // 25000 / 3850 = 6 shares
    });

    it('should return 404 for non-existent company identifier', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/ai/buy-analysis')
        .send({ companyId: fakeId });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject requests with missing companyId with 400', async () => {
      const res = await request(app)
        .post('/api/ai/buy-analysis')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject negative investment amount with 400', async () => {
      const res = await request(app)
        .post('/api/ai/buy-analysis')
        .send({
          companyId,
          investmentAmount: -5000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── 2. POST /api/ai/sell-analysis ────────────────────────────────────────
  describe('2. POST /api/ai/sell-analysis', () => {
    it('should generate structured sell analysis by MongoDB ID', async () => {
      const res = await request(app)
        .post('/api/ai/sell-analysis')
        .send({ companyId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('Tata Consultancy Services Ltd');
      expect(res.body.data.stockSymbol).toBe('TCS');
      expect(res.body.data.latestAvailablePrice).toBe(3850);
      expect(res.body.data.cashFlowAnalysis).toHaveProperty('status');
      expect(res.body.data.debtAnalysis).toHaveProperty('leverageRisk');
      expect(res.body.data.valuationConsiderations).toHaveProperty('evaluation');
      expect(res.body.data.historicalPriceMovement).toHaveProperty('high52Week', 4200);
      expect(Array.isArray(res.body.data.reasonsToHold)).toBe(true);
      expect(res.body.data.hypotheticalProfitLoss).toBeNull();
      expect(res.body.data.aiGeneratedExplanation).toBeTruthy();
      expect(res.body.data.disclaimer).toContain('NOT a recommendation');
    });

    it('should calculate hypothetical profit when purchasePrice and quantityHeld are provided', async () => {
      const res = await request(app)
        .post('/api/ai/sell-analysis')
        .send({
          companyId,
          purchasePrice: 3200, // bought at 3200, current price 3850 (+650/share)
          quantityHeld: 10,
        });

      expect(res.status).toBe(200);
      const pnl = res.body.data.hypotheticalProfitLoss;
      expect(pnl).not.toBeNull();
      expect(pnl.purchasePrice).toBe(3200);
      expect(pnl.currentPrice).toBe(3850);
      expect(pnl.quantityHeld).toBe(10);
      expect(pnl.investedAmount).toBe(32000);
      expect(pnl.currentValue).toBe(38500);
      expect(pnl.profitLoss).toBe(6500);
      expect(pnl.profitLossPercent).toBe(20.31);
      expect(pnl.status).toBe('PROFIT');
    });

    it('should calculate hypothetical loss correctly', async () => {
      const res = await request(app)
        .post('/api/ai/sell-analysis')
        .send({
          companyId,
          purchasePrice: 4200, // bought at 4200, current price 3850 (-350/share)
          quantityHeld: 5,
        });

      expect(res.status).toBe(200);
      const pnl = res.body.data.hypotheticalProfitLoss;
      expect(pnl).not.toBeNull();
      expect(pnl.profitLoss).toBe(-1750);
      expect(pnl.profitLossPercent).toBe(-8.33);
      expect(pnl.status).toBe('LOSS');
    });

    it('should support alias sharesHeld for quantityHeld', async () => {
      const res = await request(app)
        .post('/api/ai/sell-analysis')
        .send({
          companyId: 'TCS',
          purchasePrice: 3500,
          sharesHeld: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.hypotheticalProfitLoss.quantityHeld).toBe(2);
    });

    it('should return 404 for non-existent company', async () => {
      const res = await request(app)
        .post('/api/ai/sell-analysis')
        .send({ companyId: 'NONEXISTENT_XYZ' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject negative purchase price or invalid quantity with 400', async () => {
      const res = await request(app)
        .post('/api/ai/sell-analysis')
        .send({
          companyId,
          purchasePrice: -100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
