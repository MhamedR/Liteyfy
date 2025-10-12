import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { graphqlHTTP } from 'express-graphql';
import { database, redis, createLogger } from '../../../shared/index.js';
import subscriptionRoutes from './routes/subscriptions.js';
import gdprRoutes from './routes/gdpr.js';
import { schema, root } from './graphql/schema.js';
import gdprService from '../../../shared/services/gdprService.js';
import cron from 'node-cron';

const logger = createLogger('user-subscription-service');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-subscription-service',
    timestamp: new Date().toISOString(),
    database: database.checkConnection() ? 'connected' : 'disconnected'
  });
});

// REST API routes
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/gdpr', gdprRoutes);

// GraphQL endpoint
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: process.env.NODE_ENV !== 'production',
  customFormatErrorFn: (error) => {
    logger.error('GraphQL Error:', error);
    return {
      message: error.message,
      statusCode: error.extensions?.statusCode || 500
    };
  }
}));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found'
    }
  });
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  try {
    await database.disconnect();
    await redis.disconnect();
    logger.info('All connections closed. Exiting...');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Schedule GDPR compliance jobs
// Run daily at 2 AM to check for scheduled deletions
cron.schedule('0 2 * * *', async () => {
  logger.info('Running scheduled GDPR data deletion job...');
  try {
    const result = await gdprService.executeScheduledDeletions();
    logger.info(`GDPR deletion job completed: ${result.deleted} users deleted`);
  } catch (error) {
    logger.error('Error in GDPR deletion job:', error);
  }
});

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await database.connect();
    await redis.connect();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`User Subscription Service running on port ${PORT}`);
      logger.info(`GraphQL Playground available at http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

