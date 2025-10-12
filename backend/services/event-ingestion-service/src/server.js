import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { database, KafkaConnection, createLogger } from '../../../shared/index.js';
import { TrainDataAdapter } from './adapters/trainDataAdapter.js';
import { WeatherDataAdapter } from './adapters/weatherDataAdapter.js';
import { StibDataAdapter } from './adapters/stibDataAdapter.js';
import { EventProcessor } from './jobs/eventProcessor.js';

const logger = createLogger('event-ingestion-service');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'event-ingestion-service', timestamp: new Date().toISOString() });
});

// Initialize adapters and processor
const trainAdapter = new TrainDataAdapter();
const weatherAdapter = new WeatherDataAdapter();
const stibAdapter = new StibDataAdapter();
const kafkaConnection = new KafkaConnection({ clientId: 'event-ingestion-service' });
const eventProcessor = new EventProcessor(kafkaConnection);

// Flag to track if processor is initialized
let processorInitialized = false;

// Schedule jobs
cron.schedule('*/2 * * * *', async () => {
  if (!processorInitialized) return;
  logger.info('Running train data ingestion...');
  try {
    const events = await trainAdapter.fetchAndNormalize();
    await eventProcessor.processEvents(events, 'train-events');
  } catch (error) {
    logger.error('Train data ingestion failed:', error);
  }
});

cron.schedule('*/5 * * * *', async () => {
  if (!processorInitialized) return;
  logger.info('Running weather data ingestion...');
  try {
    const events = await weatherAdapter.fetchAndNormalize();
    await eventProcessor.processEvents(events, 'weather-events');
  } catch (error) {
    logger.error('Weather data ingestion failed:', error);
  }
});

cron.schedule('*/3 * * * *', async () => {
  if (!processorInitialized) return;
  logger.info('Running STIB data ingestion...');
  try {
    const events = await stibAdapter.fetchAndNormalize();
    await eventProcessor.processEvents(events, 'stib-events');
  } catch (error) {
    logger.error('STIB data ingestion failed:', error);
  }
});

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
    await kafkaConnection.createProducer();
    await eventProcessor.initialize();
    processorInitialized = true;

    app.listen(PORT, () => {
      logger.info(`Event Ingestion Service running on port ${PORT}`);
      logger.info('Kafka producer initialized and ready for event processing');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

