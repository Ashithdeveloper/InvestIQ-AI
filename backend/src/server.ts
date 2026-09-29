import app from './app';
import { connectDB, disconnectDB } from './config/database';

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[InvestIQ-AI] Backend server running on port ${PORT}`);
      console.log(`[InvestIQ-AI] Health check available at http://localhost:${PORT}/api/health`);
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
