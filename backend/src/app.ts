import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes';
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

// Primary Application Routes Router
app.use('/api', apiRouter);

// Catch 404 Not Found for undefined routes
app.use((_req: Request, res: Response) => {
  sendError(res, 404, 'Endpoint not found');
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
export { app };
