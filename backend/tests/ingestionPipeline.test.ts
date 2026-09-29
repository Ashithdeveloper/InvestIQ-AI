import request from 'supertest';
import app from '../src/app';
import Company from '../src/models/Company.model';
import { INDIAN_COMPANY_SEED_LIST, SEED_COMPANY_COUNT } from '../src/config/companyList';
import {
  seedCompanyRecords,
  getIngestionProgress,
  runIngestionPipeline,
} from '../src/services/ingestion.pipeline';

describe('Task 1: Backend Company Seed Data & Startup Ingestion Pipeline', () => {
  // ── 1. Company Seed List Verification ────────────────────────────────────
  describe('1. Company Seed List (55 Indian Companies)', () => {
    it('should have at least 55 configured Indian companies', () => {
      expect(INDIAN_COMPANY_SEED_LIST.length).toBeGreaterThanOrEqual(55);
      expect(SEED_COMPANY_COUNT).toBe(INDIAN_COMPANY_SEED_LIST.length);
    });

    it('should have unique stock symbols for every company', () => {
      const symbols = INDIAN_COMPANY_SEED_LIST.map((c) => c.symbol.toUpperCase());
      const uniqueSymbols = new Set(symbols);
      expect(uniqueSymbols.size).toBe(symbols.length);
    });

    it('should have valid Screener.in URLs and assigned sectors', () => {
      INDIAN_COMPANY_SEED_LIST.forEach((company) => {
        expect(company.symbol).toBeTruthy();
        expect(company.symbol).toBe(company.symbol.toUpperCase());
        expect(company.url).toMatch(/^https:\/\/www\.screener\.in\/company\/[A-Z0-9%_-]+\/consolidated\/?$/);
        expect(company.sector).toBeTruthy();
      });
    });

    it('should cover key diversified Indian sectors', () => {
      const sectors = new Set(INDIAN_COMPANY_SEED_LIST.map((c) => c.sector));
      expect(sectors.has('IT - Software')).toBe(true);
      expect(sectors.has('Banks')).toBe(true);
      expect(sectors.has('Automobiles')).toBe(true);
      expect(sectors.has('FMCG')).toBe(true);
      expect(sectors.has('Pharmaceuticals')).toBe(true);
      expect(sectors.has('Steel')).toBe(true);
    });
  });

  // ── 2. Company Model Ingestion Status ───────────────────────────────────
  describe('2. Company Model Ingestion Status Tracking', () => {
    it('should default ingestionStatus to "pending" and ingestionError to null', async () => {
      const company = await Company.create({
        companyName: 'Test Company Ltd',
        symbol: 'TESTCO',
        sector: 'Technology',
        profileUrl: 'https://www.screener.in/company/TESTCO/consolidated/',
      });

      expect(company.ingestionStatus).toBe('pending');
      expect(company.ingestionError).toBeNull();
    });

    it('should support all ingestionStatus enum values', async () => {
      const statuses: Array<'pending' | 'processing' | 'completed' | 'failed' | 'needs_refresh'> = [
        'pending',
        'processing',
        'completed',
        'failed',
        'needs_refresh',
      ];

      for (const status of statuses) {
        const doc = await Company.create({
          companyName: `Test ${status}`,
          symbol: `SYM_${status.toUpperCase()}`,
          sector: 'General',
          profileUrl: `https://www.screener.in/company/SYM_${status}/consolidated/`,
          ingestionStatus: status,
        });
        expect(doc.ingestionStatus).toBe(status);
      }
    });
  });

  // ── 3. Seed Company Records & Idempotence ────────────────────────────────
  describe('3. Idempotent Company Seeding', () => {
    it('should seed all companies on first run', async () => {
      const seeded = await seedCompanyRecords();
      expect(seeded).toBe(INDIAN_COMPANY_SEED_LIST.length);

      const count = await Company.countDocuments();
      expect(count).toBe(INDIAN_COMPANY_SEED_LIST.length);
    });

    it('should prevent duplicate records on subsequent runs (idempotence)', async () => {
      // First seed
      await seedCompanyRecords();
      const countAfterFirst = await Company.countDocuments();

      // Second seed run
      const seededSecond = await seedCompanyRecords();
      const countAfterSecond = await Company.countDocuments();

      expect(seededSecond).toBe(0);
      expect(countAfterSecond).toBe(countAfterFirst);
    });

    it('should set initial ingestionStatus to pending for seeded companies', async () => {
      await seedCompanyRecords();
      const tcs = await Company.findOne({ symbol: 'TCS' });
      expect(tcs).not.toBeNull();
      expect(tcs?.ingestionStatus).toBe('pending');
      expect(tcs?.dataSource).toBe('Screener.in');
    });
  });

  // ── 4. Ingestion Progress & Status Endpoints ─────────────────────────────
  describe('4. Ingestion Progress & REST APIs', () => {
    it('should get initial progress structure', () => {
      const prog = getIngestionProgress();
      expect(prog).toHaveProperty('status');
      expect(prog).toHaveProperty('totalCompanies');
      expect(prog).toHaveProperty('seeded');
      expect(prog).toHaveProperty('scraped');
      expect(prog).toHaveProperty('ingested');
      expect(prog).toHaveProperty('failed');
      expect(prog).toHaveProperty('errors');
    });

    it('GET /api/scraper/pipeline/status should return pipeline progress', async () => {
      const res = await request(app).get('/api/scraper/pipeline/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('totalCompanies');
    });

    it('POST /api/scraper/pipeline/trigger should initiate ingestion background job', async () => {
      const res = await request(app).post('/api/scraper/pipeline/trigger');
      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.started).toBe(true);
    });
  });

  // ── 5. Error & Failure Handling ──────────────────────────────────────────
  describe('5. Error Handling & Ingestion Resilience', () => {
    it('should record failure state without throwing fatal exceptions', async () => {
      const company = await Company.create({
        companyName: 'Faulty Stock Ltd',
        symbol: 'FAULTY',
        sector: 'Test',
        profileUrl: 'https://www.screener.in/company/FAULTY/consolidated/',
        ingestionStatus: 'failed',
        ingestionError: 'Connection timeout while scraping',
      });

      expect(company.ingestionStatus).toBe('failed');
      expect(company.ingestionError).toBe('Connection timeout while scraping');
    });
  });
});
