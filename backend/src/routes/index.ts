import { Router } from 'express';
import authRouter from './auth.routes';
import profileRouter from './profile.routes';
import scraperRouter from './scraper.routes';
import companyRouter from './company.routes';
import analysisRouter from './analysis.routes';
import dashboardRouter from './dashboard.routes';
import investmentRouter from './investment.routes';
import aiRouter from './ai.routes';

const apiRouter = Router();

// ============================================================================
// INVESTIQ-AI API ROUTE REGISTRY
// ============================================================================

// 1. User Authentication & Session Management
apiRouter.use('/auth', authRouter);

// 2. User Financial Profile Management (Age, Salary, Monthly Budget)
apiRouter.use('/profile', profileRouter);

// 3. Indian Company Data Scraping (Playwright + Screener.in)
apiRouter.use('/scraper', scraperRouter);

// 4. Company Exploration, Search & Sector Filtering
apiRouter.use('/companies', companyRouter);

// 5. Deterministic Financial Analysis Engine (FCF, ROE, Debt/Equity, Valuation)
apiRouter.use('/analysis', analysisRouter);

// 6. Personalized Recommendation Dashboard (Profile-tailored company metrics & risks)
apiRouter.use('/dashboard', dashboardRouter);

// 7. Investment Scenario Engine (Whole-share calculations & budget comparison)
apiRouter.use('/investment', investmentRouter);

// 8. RAG Pipeline, Qdrant Vector Search & Ollama Cloud GPT-OSS 4B Chat
apiRouter.use('/ai', aiRouter);

export default apiRouter;
export { apiRouter };
