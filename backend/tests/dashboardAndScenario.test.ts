import request from 'supertest';
import app from '../src/app';
import Company, { ICompany } from '../src/models/Company.model';
import User from '../src/models/User.model';

describe('Personalized Recommendation Dashboard & Investment Scenario Engine Tests', () => {
  let userTokenA: string;
  let userIdA: string;
  let userTokenB: string;
  let userIdB: string;
  let testCompanyA: ICompany;
  let testCompanyB: ICompany;
  let noPriceCompany: ICompany;

  beforeEach(async () => {
    await Company.deleteMany({});
    await User.deleteMany({});

    // Register User A (Will have complete financial profile)
    const signupA = await request(app).post('/api/auth/signup').send({
      username: 'InvestorAlpha',
      email: 'alpha@investiq.ai',
      password: 'SecurePassword123',
    });
    userTokenA = signupA.body.data.token;
    userIdA = signupA.body.data.user.id;

    // Register User B (Will have incomplete financial profile)
    const signupB = await request(app).post('/api/auth/signup').send({
      username: 'InvestorBeta',
      email: 'beta@investiq.ai',
      password: 'SecurePassword123',
    });
    userTokenB = signupB.body.data.token;
    userIdB = signupB.body.data.user.id;

    // Seed User A's financial profile
    await request(app)
      .post('/api/profile/financial')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        age: 30,
        monthlySalary: 75000,
        monthlyInvestmentBudget: 5000,
      });

    // Create Company A (Standard healthy company: ₹1,000 share price)
    testCompanyA = await Company.create({
      companyName: 'Infosys Limited',
      symbol: 'INFY',
      sector: 'Information Technology',
      profileUrl: 'https://www.screener.in/company/INFY/consolidated/',
      exchange: ['NSE', 'BSE'],
      marketCap: 600000,
      sharePrice: 1000,
      high52Week: 1600,
      low52Week: 950,
      financialMetrics: {
        revenue: 153670,
        netProfit: 26233,
        freeCashFlow: 22000,
        roe: 32.5,
        roce: 40.1,
        debtToEquity: 0.1,
        peRatio: 22.8,
        bookValue: 210,
        dividendYield: 2.8,
        opm: 21.0,
        eps: 63.2,
      },
      financialStatements: [
        {
          statementType: 'ProfitAndLoss',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Sales', values: [146767, 153670] },
            { metricName: 'Operating Profit', values: [35130, 37000] },
            { metricName: 'Net Profit', values: [24095, 26233] },
          ],
        },
        {
          statementType: 'CashFlow',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Free Cash Flow', values: [19500, 22000] },
            { metricName: 'Cash from Operating Activity', values: [25000, 28000] },
          ],
        },
        {
          statementType: 'BalanceSheet',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Share Capital', values: [2000, 2000] },
            { metricName: 'Reserves', values: [73000, 81000] },
            { metricName: 'Borrowings', values: [8000, 8300] },
          ],
        },
      ],
      dataSource: 'Screener.in',
    });

    // Create Company B (High debt company: ₹2,400 share price)
    testCompanyB = await Company.create({
      companyName: 'Tata Steel Limited',
      symbol: 'TATASTEEL',
      sector: 'Metals & Mining',
      profileUrl: 'https://www.screener.in/company/TATASTEEL/',
      exchange: ['NSE'],
      marketCap: 180000,
      sharePrice: 2400,
      high52Week: 2600,
      low52Week: 1500,
      financialMetrics: {
        revenue: 229171,
        netProfit: -4910,
        freeCashFlow: -3200,
        roe: -5.2,
        roce: 8.5,
        debtToEquity: 1.85,
        peRatio: null,
        bookValue: 78,
        dividendYield: 1.2,
        opm: 10.5,
        eps: -4.0,
      },
      financialStatements: [
        {
          statementType: 'ProfitAndLoss',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Sales', values: [243352, 229171] },
            { metricName: 'Net Profit', values: [8075, -4910] },
          ],
        },
        {
          statementType: 'BalanceSheet',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Borrowings', values: [85000, 92000] },
            { metricName: 'Reserves', values: [48000, 49700] },
          ],
        },
        {
          statementType: 'CashFlow',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [{ metricName: 'Free Cash Flow', values: [1200, -3200] }],
        },
      ],
      dataSource: 'Screener.in',
    });

    // Create Company without share price (to test missing price handling)
    noPriceCompany = await Company.create({
      companyName: 'Private Equity Holdings Ltd',
      symbol: 'PEHOLD',
      sector: 'Finance',
      profileUrl: 'https://www.screener.in/company/PEHOLD/',
      exchange: ['NSE'],
      sharePrice: null,
      marketCap: null,
      financialMetrics: {
        revenue: null,
        netProfit: null,
        freeCashFlow: null,
        roe: null,
        roce: null,
        debtToEquity: null,
        peRatio: null,
        bookValue: null,
        dividendYield: null,
        opm: null,
        eps: null,
      },
      financialStatements: [],
    });
  });

  // =========================================================================
  // 1. PERSONALIZED DASHBOARD API (GET /api/dashboard)
  // =========================================================================
  describe('GET /api/dashboard', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject when user financial profile is incomplete with 400', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${userTokenB}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('incomplete');
      expect(res.body.data.profileCompleted).toBe(false);
      expect(res.body.data.requiredFields).toBeDefined();
    });

    it('should return personalized dashboard data for complete profile', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${userTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.monthlyInvestmentBudget).toBe(5000);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.profileCompleted).toBe(true);
      expect(Array.isArray(res.body.data.companies)).toBe(true);
      expect(res.body.data.companies.length).toBeGreaterThanOrEqual(2);

      // Check Company A summary
      const infy = res.body.data.companies.find(
        (c: { symbol: string }) => c.symbol === 'INFY'
      );
      expect(infy).toBeDefined();
      expect(infy.latestSharePrice).toBe(1000);
      expect(infy.marketCap).toBe(600000);
      expect(infy.freeCashFlow.value).toBe(22000);
      expect(infy.returnOnEquity.value).toBe(33.21);
      expect(infy.debtToEquity.value).toBe(0.1);
      expect(infy.profitability.revenueGrowthYoY).toBeDefined();
      expect(infy.historicalStockPriceData.high52Week).toBe(1600);
      expect(infy.historicalStockPriceData.low52Week).toBe(950);

      // Check hypothetical allocation for User A's ₹5000 budget:
      // ₹5000 / ₹1000 = 5 whole shares
      expect(infy.hypotheticalScenarioSummary).toEqual({
        monthlyBudget: 5000,
        purchasableShares: 5,
        amountInvested: 5000,
        unallocatedCash: 0,
        sharePrice: 1000,
      });

      // Check Company B summary (₹2400 share price)
      // ₹5000 / ₹2400 = 2 whole shares (₹4800 invested, ₹200 unallocated)
      const tata = res.body.data.companies.find(
        (c: { symbol: string }) => c.symbol === 'TATASTEEL'
      );
      expect(tata).toBeDefined();
      expect(tata.hypotheticalScenarioSummary).toEqual({
        monthlyBudget: 5000,
        purchasableShares: 2,
        amountInvested: 4800,
        unallocatedCash: 200,
        sharePrice: 2400,
      });

      // Check identified financial risks for high-debt Tata Steel
      expect(tata.financialRisks.some((r: string) => r.includes('Leverage'))).toBe(
        true
      );
      expect(tata.financialRisks.some((r: string) => r.includes('Cash Burn'))).toBe(
        true
      );
    });

    it('should isolate user financial profiles strictly', async () => {
      // User B completes profile with a different budget (₹12,000)
      await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenB}`)
        .send({
          age: 42,
          monthlySalary: 120000,
          monthlyInvestmentBudget: 12000,
        });

      const resB = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${userTokenB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.monthlyInvestmentBudget).toBe(12000);

      const infyB = resB.body.data.companies.find(
        (c: { symbol: string }) => c.symbol === 'INFY'
      );
      // ₹12,000 / ₹1,000 = 12 shares
      expect(infyB.hypotheticalScenarioSummary.purchasableShares).toBe(12);

      // Verify User A still has ₹5,000 budget
      const resA = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${userTokenA}`);
      expect(resA.body.data.monthlyInvestmentBudget).toBe(5000);
    });
  });

  // =========================================================================
  // 2. HYPOTHETICAL INVESTMENT SCENARIO API (POST /api/investment/scenario)
  // =========================================================================
  describe('POST /api/investment/scenario', () => {
    it('should calculate scenario correctly for known positive price movement (+10%)', async () => {
      // Monthly Budget: ₹5,000, Share Price: ₹1,000, +10%
      const res = await request(app).post('/api/investment/scenario').send({
        companyId: testCompanyA._id.toString(),
        monthlyBudget: 5000,
        hypotheticalPriceChangePercent: 10,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isHypothetical).toBe(true);

      const calc = res.body.data.calculation;
      expect(calc.wholeShares).toBe(5);
      expect(calc.amountInvested).toBe(5000);
      expect(calc.unallocatedCash).toBe(0);
      expect(calc.hypotheticalNewPrice).toBe(1100);
      expect(calc.estimatedValue).toBe(5500);
      expect(calc.hypotheticalGainLoss).toBe(500);
      expect(calc.hypotheticalGainLossPercent).toBe(10);
      expect(calc.totalPortfolioValue).toBe(5500);

      // Verify disclaimers and assumptions
      expect(res.body.data.assumptionsAndLimitations.length).toBeGreaterThan(0);
      expect(
        res.body.data.assumptionsAndLimitations.some((a: string) =>
          a.includes('whole-share')
        )
      ).toBe(true);
    });

    it('should calculate scenario correctly for negative price movement (-10%)', async () => {
      // Monthly Budget: ₹5,000, Share Price: ₹1,000, -10%
      const res = await request(app).post('/api/investment/scenario').send({
        companyId: testCompanyA._id.toString(),
        monthlyBudget: 5000,
        hypotheticalPriceChangePercent: -10,
      });

      expect(res.status).toBe(200);
      const calc = res.body.data.calculation;
      expect(calc.wholeShares).toBe(5);
      expect(calc.amountInvested).toBe(5000);
      expect(calc.hypotheticalNewPrice).toBe(900);
      expect(calc.estimatedValue).toBe(4500);
      expect(calc.hypotheticalGainLoss).toBe(-500);
      expect(calc.hypotheticalGainLossPercent).toBe(-10);
      expect(calc.totalPortfolioValue).toBe(4500);
    });

    it('should calculate whole shares and unallocated cash when budget does not divide evenly', async () => {
      // Budget: ₹5,000, Share Price: ₹2,400, +15%
      // 5000 / 2400 = 2 shares, ₹4800 invested, ₹200 unallocated cash
      const res = await request(app).post('/api/investment/scenario').send({
        companyId: testCompanyB._id.toString(),
        monthlyBudget: 5000,
        hypotheticalPriceChangePercent: 15,
      });

      expect(res.status).toBe(200);
      const calc = res.body.data.calculation;
      expect(calc.wholeShares).toBe(2);
      expect(calc.amountInvested).toBe(4800);
      expect(calc.unallocatedCash).toBe(200);
      // New Price: 2400 * 1.15 = 2760
      expect(calc.hypotheticalNewPrice).toBe(2760);
      // Estimated Value: 2 * 2760 = 5520
      expect(calc.estimatedValue).toBe(5520);
      // Gain: 5520 - 4800 = 720
      expect(calc.hypotheticalGainLoss).toBe(720);
      // Total portfolio: 5520 + 200 = 5720
      expect(calc.totalPortfolioValue).toBe(5720);
    });

    it('should handle budget lower than single share price safely', async () => {
      // Budget: ₹500, Share Price: ₹1,000
      const res = await request(app).post('/api/investment/scenario').send({
        companyId: testCompanyA._id.toString(),
        monthlyBudget: 500,
        hypotheticalPriceChangePercent: 10,
      });

      expect(res.status).toBe(200);
      const calc = res.body.data.calculation;
      expect(calc.wholeShares).toBe(0);
      expect(calc.amountInvested).toBe(0);
      expect(calc.unallocatedCash).toBe(500);
      expect(calc.estimatedValue).toBe(0);
      expect(calc.hypotheticalGainLoss).toBe(0);
      expect(calc.totalPortfolioValue).toBe(500);
    });

    it('should reject calculation when company share price is missing or null with 400', async () => {
      const res = await request(app).post('/api/investment/scenario').send({
        companyId: noPriceCompany._id.toString(),
        monthlyBudget: 5000,
        hypotheticalPriceChangePercent: 10,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Verified share price is not available');
    });

    it('should reject invalid inputs with 400 (negative budget, price change < -100%)', async () => {
      const invalidBudgetRes = await request(app)
        .post('/api/investment/scenario')
        .send({
          companyId: testCompanyA._id.toString(),
          monthlyBudget: -500,
          hypotheticalPriceChangePercent: 10,
        });
      expect(invalidBudgetRes.status).toBe(400);

      const invalidPercentRes = await request(app)
        .post('/api/investment/scenario')
        .send({
          companyId: testCompanyA._id.toString(),
          monthlyBudget: 5000,
          hypotheticalPriceChangePercent: -150,
        });
      expect(invalidPercentRes.status).toBe(400);
    });

    it('should return 404 for non-existent company ID', async () => {
      const res = await request(app).post('/api/investment/scenario').send({
        companyId: '507f1f77bcf86cd799439011',
        monthlyBudget: 5000,
        hypotheticalPriceChangePercent: 10,
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. BUDGET COMPARISON API (POST /api/investment/compare-budget)
  // =========================================================================
  describe('POST /api/investment/compare-budget', () => {
    it('should compare two budget scenarios with identical assumptions (+10% gain)', async () => {
      // Company A (Share Price ₹1,000): Current Budget ₹5,000 vs Alternative Budget ₹7,000
      const res = await request(app).post('/api/investment/compare-budget').send({
        companyId: testCompanyA._id.toString(),
        currentBudget: 5000,
        alternativeBudget: 7000,
        hypotheticalPriceChangePercent: 10,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isHypothetical).toBe(true);

      const { currentScenario, alternativeScenario, comparison, riskAnalysis } =
        res.body.data;

      expect(currentScenario.wholeShares).toBe(5);
      expect(currentScenario.amountInvested).toBe(5000);
      expect(currentScenario.estimatedValue).toBe(5500);
      expect(currentScenario.hypotheticalGainLoss).toBe(500);

      expect(alternativeScenario.wholeShares).toBe(7);
      expect(alternativeScenario.amountInvested).toBe(7000);
      expect(alternativeScenario.estimatedValue).toBe(7700);
      expect(alternativeScenario.hypotheticalGainLoss).toBe(700);

      expect(comparison.budgetDifference).toBe(2000);
      expect(comparison.additionalInvestedAmount).toBe(2000);
      expect(comparison.additionalShares).toBe(2);
      expect(comparison.estimatedValueDifference).toBe(2200);
      expect(comparison.gainLossDifference).toBe(200);

      expect(riskAnalysis.warning).toBeDefined();
      expect(riskAnalysis.lossExposureNote).toBeDefined();
    });

    it('should clearly highlight magnified capital loss for negative scenarios (-20%)', async () => {
      const res = await request(app).post('/api/investment/compare-budget').send({
        companyId: testCompanyA._id.toString(),
        currentBudget: 5000,
        alternativeBudget: 10000,
        hypotheticalPriceChangePercent: -20,
      });

      expect(res.status).toBe(200);
      const { currentScenario, alternativeScenario, comparison, riskAnalysis } =
        res.body.data;

      expect(currentScenario.hypotheticalGainLoss).toBe(-1000);
      expect(alternativeScenario.hypotheticalGainLoss).toBe(-2000);
      expect(comparison.gainLossDifference).toBe(-1000);
      expect(riskAnalysis.lossExposureNote).toContain('additional capital loss');
    });

    it('should reject invalid budget comparisons with 400', async () => {
      const res = await request(app).post('/api/investment/compare-budget').send({
        companyId: testCompanyA._id.toString(),
        currentBudget: -1000,
        alternativeBudget: 5000,
        hypotheticalPriceChangePercent: 10,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 4. PERSONALIZED COMPANY ANALYSIS API (POST /api/dashboard/company-analysis)
  // =========================================================================
  describe('POST /api/dashboard/company-analysis', () => {
    it('should generate personalized company analysis with RAG and user budget suitability', async () => {
      const res = await request(app)
        .post('/api/dashboard/company-analysis')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          companyId: testCompanyA._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.company.symbol).toBe('INFY');
      expect(res.body.data.financialMetrics.freeCashFlow.value).toBe(22000);
      expect(res.body.data.financialMetrics.returnOnEquity.value).toBe(33.21);
      expect(res.body.data.aiExplanation).toBeDefined();
      expect(Array.isArray(res.body.data.financialRisks)).toBe(true);
      expect(res.body.data.sources).toContain('Screener.in');

      // Check budget suitability for User A's ₹5000 budget
      expect(res.body.data.budgetSuitability).toBeDefined();
      expect(res.body.data.budgetSuitability.monthlyBudget).toBe(5000);
      expect(res.body.data.budgetSuitability.purchasableShares).toBe(5);
      expect(res.body.data.budgetSuitability.suitabilityNote).toContain('5 whole shares');
    });

    it('should generate company analysis without user profile when called unauthenticated', async () => {
      const res = await request(app)
        .post('/api/dashboard/company-analysis')
        .send({
          companyId: testCompanyB._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.company.symbol).toBe('TATASTEEL');
      expect(res.body.data.financialMetrics).toBeDefined();
      expect(res.body.data.budgetSuitability).toBeNull();
    });

    it('should reject company analysis with 400 when companyId is missing', async () => {
      const res = await request(app)
        .post('/api/dashboard/company-analysis')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject company analysis with 404 when company does not exist', async () => {
      const res = await request(app)
        .post('/api/dashboard/company-analysis')
        .send({
          companyId: '507f1f77bcf86cd799439011',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
