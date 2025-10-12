import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { database, redis, createLogger } from '../../../shared/index.js';
import analyticsRoutes from './routes/analytics.js';

const logger = createLogger('analytics-service');
const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'analytics-service', timestamp: new Date().toISOString() });
});

// Analytics API routes
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.statusCode || 500).json({ error: { message: err.message || 'Internal server error' } });
});

const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  await database.disconnect();
  await redis.disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const startServer = async () => {
  try {
    await database.connect();
    await redis.connect();

    app.listen(PORT, () => {
      logger.info(`Analytics Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

