import app from './app';
import { connectDB, disconnectDB } from './config/database';
import { runIngestionPipeline } from './services/ingestion.pipeline';
import { ensureCollection } from './services/rag/qdrant/qdrant.service';

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Qdrant collection (non-blocking, graceful fallback)
    await ensureCollection().catch(() => {
      console.log('[InvestIQ-AI] Qdrant not available — using in-memory vector store.');
    });

    // 3. Start HTTP server immediately (do not block on data pipeline)
    const server = app.listen(PORT, () => {
      console.log(`[InvestIQ-AI] Backend server running on port ${PORT}`);
      console.log(`[InvestIQ-AI] Health check available at http://localhost:${PORT}/api/health`);
    });

    // 4. Launch background ingestion pipeline (non-blocking)
    setImmediate(() => {
      runIngestionPipeline().catch((err) => {
        console.error('[InvestIQ-AI] Background ingestion pipeline error:', err);
      });
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[InvestIQ-AI] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('[InvestIQ-AI] Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('[InvestIQ-AI] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

