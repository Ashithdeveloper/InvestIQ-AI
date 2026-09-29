import mongoose from 'mongoose';

const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/investiq_db';

  try {
    const connection = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected to database: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
};

const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error('[MongoDB] Disconnect error:', error);
    throw error;
  }
};

export { connectDB, disconnectDB };
