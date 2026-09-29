import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.routes';
import profileRouter from './routes/profile.routes';
import scraperRouter from './routes/scraper.routes';
import companyRouter from './routes/company.routes';
import analysisRouter from './routes/analysis.routes';
import aiRouter from './routes/ai.routes';
import { errorHandler } from './middleware/error.middleware';
import { sendError } from './utils/apiResponse';

dotenv.config();

const app: Express = express();

// Security and utility middleware
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Application Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/scraper', scraperRouter);
app.use('/api/companies', companyRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/ai', aiRouter);

// Catch 404 Not Found for undefined routes
app.use((_req: Request, res: Response) => {
  sendError(res, 404, 'Endpoint not found');
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
export { app };
