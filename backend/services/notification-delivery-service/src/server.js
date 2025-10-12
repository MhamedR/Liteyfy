import 'dotenv/config';
import express from 'express';
import webpush from 'web-push';
import { database, KafkaConnection, createLogger } from '../../../shared/index.js';
import { EventConsumer } from './consumers/eventConsumer.js';
import { NotificationService } from './services/notificationService.js';

const logger = createLogger('notification-delivery-service');
const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@liteyfy.be',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-delivery-service', timestamp: new Date().toISOString() });
});

// Initialize services
const kafkaConnection = new KafkaConnection({ clientId: 'notification-delivery-service' });
const notificationService = new NotificationService(webpush);
const eventConsumer = new EventConsumer(kafkaConnection, notificationService);

const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  await database.disconnect();
  await kafkaConnection.disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const startServer = async () => {
  try {
    await database.connect();
    await kafkaConnection.createConsumer('notification-delivery-group', [
      'train-events',
      'weather-events',
      'stib-events'
    ]);

    // Start consuming events
    await eventConsumer.start();

    app.listen(PORT, () => {
      logger.info(`Notification Delivery Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

