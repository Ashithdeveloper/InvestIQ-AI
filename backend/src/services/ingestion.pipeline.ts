// ============================================================================
// INVESTIQ-AI: BACKGROUND DATA INGESTION PIPELINE
// ============================================================================
// Idempotent pipeline that runs on server startup.
// - Seeds company records if database is empty
// - Scrapes missing/stale company data from Screener.in
// - Generates RAG documents and embeddings
// - Stores vectors in Qdrant (with memory fallback)
// - Tracks progress and status per company
// - Never blocks the HTTP server from starting
// ============================================================================

import Company, { ICompany } from '../models/Company.model';
import { INDIAN_COMPANY_SEED_LIST, SeedCompany } from '../config/companyList';
import { scrapeCompanyData } from './scraper.service';
import { saveOrUpdateCompany } from './company.service';
import { ingestCompanyFinancials } from './rag/ingestion/ingestion.service';
import { ensureCollection } from './rag/qdrant/qdrant.service';

// ── Progress Tracking ───────────────────────────────────────────────────
export interface IngestionProgress {
  status: 'idle' | 'seeding' | 'scraping' | 'ingesting' | 'completed' | 'error';
  totalCompanies: number;
  seeded: number;
  scraped: number;
  ingested: number;
  failed: number;
  skipped: number;
  currentCompany: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errors: Array<{ symbol: string; error: string }>;
}

const progress: IngestionProgress = {
  status: 'idle',
  totalCompanies: 0,
  seeded: 0,
  scraped: 0,
  ingested: 0,
  failed: 0,
  skipped: 0,
  currentCompany: null,
  startedAt: null,
  completedAt: null,
  errors: [],
};

const getIngestionProgress = (): IngestionProgress => ({ ...progress });

// ── Data Freshness Check ────────────────────────────────────────────────
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isDataStale = (company: ICompany): boolean => {
  if (!company.lastUpdated) return true;
  if (!company.sharePrice && !company.marketCap) return true;
  if (company.ingestionStatus === 'failed' || company.ingestionStatus === 'needs_refresh') return true;
  const age = Date.now() - new Date(company.lastUpdated).getTime();
  return age > STALE_THRESHOLD_MS;
};

// ── Step 1: Seed Company Records ────────────────────────────────────────
const seedCompanyRecords = async (): Promise<number> => {
  let seededCount = 0;

  for (const seed of INDIAN_COMPANY_SEED_LIST) {
    const existing = await Company.findOne({
      $or: [
        { symbol: seed.symbol.toUpperCase() },
        { profileUrl: seed.url },
      ],
    });

    if (!existing) {
      await Company.create({
        companyName: seed.symbol, // Placeholder name until scrape fills it
        symbol: seed.symbol.toUpperCase(),
        sector: seed.sector,
        profileUrl: seed.url,
        exchange: ['NSE'],
        ingestionStatus: 'pending',
        dataSource: 'Screener.in',
      });
      seededCount++;
    }
  }

  return seededCount;
};

// ── Step 2: Scrape Missing Data ─────────────────────────────────────────
const scrapeCompany = async (company: ICompany, seed: SeedCompany): Promise<boolean> => {
  try {
    await Company.findByIdAndUpdate(company._id, {
      ingestionStatus: 'processing',
      ingestionError: null,
    });

    const scrapedData = await scrapeCompanyData(seed.url);
    await saveOrUpdateCompany(scrapedData);

    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Scraping failed';
    await Company.findByIdAndUpdate(company._id, {
      ingestionStatus: 'failed',
      ingestionError: msg,
    });
    progress.errors.push({ symbol: company.symbol, error: `Scrape: ${msg}` });
    return false;
  }
};

// ── Step 3: RAG Ingestion ───────────────────────────────────────────────
const ingestCompanyRag = async (companyId: string, symbol: string): Promise<boolean> => {
  try {
    await ingestCompanyFinancials(companyId);
    await Company.findByIdAndUpdate(companyId, {
      ingestionStatus: 'completed',
      ingestionError: null,
    });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'RAG ingestion failed';
    await Company.findByIdAndUpdate(companyId, {
      ingestionStatus: 'failed',
      ingestionError: msg,
    });
    progress.errors.push({ symbol, error: `RAG: ${msg}` });
    return false;
  }
};

// ── Rate Limiter ────────────────────────────────────────────────────────
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ── Main Pipeline ───────────────────────────────────────────────────────
const runIngestionPipeline = async (): Promise<void> => {
  if (progress.status !== 'idle' && progress.status !== 'completed' && progress.status !== 'error') {
    console.log('[Pipeline] Ingestion already in progress, skipping.');
    return;
  }

  // Reset progress
  progress.status = 'seeding';
  progress.totalCompanies = INDIAN_COMPANY_SEED_LIST.length;
  progress.seeded = 0;
  progress.scraped = 0;
  progress.ingested = 0;
  progress.failed = 0;
  progress.skipped = 0;
  progress.currentCompany = null;
  progress.startedAt = new Date();
  progress.completedAt = null;
  progress.errors = [];

  console.log(`[Pipeline] Starting data ingestion for ${progress.totalCompanies} Indian companies...`);

  try {
    // ── Phase A: Ensure Qdrant collection exists ──────────────────────
    await ensureCollection();
    console.log('[Pipeline] Qdrant collection verified.');

    // ── Phase B: Seed missing company records ─────────────────────────
    const seeded = await seedCompanyRecords();
    progress.seeded = seeded;
    console.log(`[Pipeline] Seeded ${seeded} new company records.`);

    // ── Phase C: Scrape & Ingest each company ─────────────────────────
    progress.status = 'scraping';

    for (const seed of INDIAN_COMPANY_SEED_LIST) {
      progress.currentCompany = seed.symbol;

      // Find the company record
      const company = await Company.findOne({
        $or: [
          { symbol: seed.symbol.toUpperCase() },
          { profileUrl: seed.url },
        ],
      });

      if (!company) continue;

      // Check if data is fresh and ingestion is complete
      if (!isDataStale(company) && company.ingestionStatus === 'completed') {
        progress.skipped++;
        continue;
      }

      // Scrape if data is missing or stale
      const needsScrape = !company.sharePrice || !company.marketCap || isDataStale(company);

      if (needsScrape) {
        console.log(`[Pipeline] Scraping ${seed.symbol}...`);
        const scraped = await scrapeCompany(company, seed);

        if (scraped) {
          progress.scraped++;
        } else {
          progress.failed++;
          // Rate limit even on failure
          await delay(2000);
          continue;
        }

        // Respectful rate limiting (3-5s between requests)
        await delay(3000 + Math.random() * 2000);
      }

      // RAG ingestion
      progress.status = 'ingesting';
      const freshCompany = await Company.findOne({ symbol: seed.symbol.toUpperCase() });

      if (freshCompany && freshCompany.sharePrice) {
        console.log(`[Pipeline] Ingesting RAG documents for ${seed.symbol}...`);
        const ingested = await ingestCompanyRag(freshCompany._id.toString(), seed.symbol);

        if (ingested) {
          progress.ingested++;
        } else {
          progress.failed++;
        }
      }

      progress.status = 'scraping'; // Continue loop
    }

    progress.status = 'completed';
    progress.currentCompany = null;
    progress.completedAt = new Date();

    const durationSec = ((progress.completedAt.getTime() - progress.startedAt!.getTime()) / 1000).toFixed(1);

    console.log(`[Pipeline] ✅ Ingestion complete in ${durationSec}s.`);
    console.log(`[Pipeline]   Seeded: ${progress.seeded}, Scraped: ${progress.scraped}, Ingested: ${progress.ingested}, Skipped: ${progress.skipped}, Failed: ${progress.failed}`);

    if (progress.errors.length > 0) {
      console.log(`[Pipeline]   Errors (${progress.errors.length}):`);
      progress.errors.slice(0, 5).forEach((e) => console.log(`    - ${e.symbol}: ${e.error}`));
    }
  } catch (err: unknown) {
    progress.status = 'error';
    progress.completedAt = new Date();
    const msg = err instanceof Error ? err.message : 'Pipeline failed';
    console.error(`[Pipeline] ❌ Fatal pipeline error: ${msg}`);
    progress.errors.push({ symbol: 'PIPELINE', error: msg });
  }
};

export { runIngestionPipeline, getIngestionProgress, seedCompanyRecords };
