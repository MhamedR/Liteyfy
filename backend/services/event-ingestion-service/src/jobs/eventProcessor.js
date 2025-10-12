import { Event, createLogger } from '../../../../shared/index.js';
import { KafkaProducerService } from '../../../../shared/services/kafkaProducerService.js';

const logger = createLogger('event-processor');

export class EventProcessor {
  constructor(kafkaConnection) {
    this.producerService = new KafkaProducerService(kafkaConnection);
  }

  async initialize() {
    await this.producerService.initialize();
  }

  async processEvents(events, topic) {
    try {
      if (events.length === 0) {
        logger.debug('No events to process');
        return;
      }

      // Save events to database
      const savedEvents = await Event.insertMany(events);
      logger.info(`Saved ${savedEvents.length} events to database`);

      // Prepare Kafka messages with enhanced metadata
      const messages = savedEvents.map(event => ({
        eventId: event._id.toString(),
        source: event.source,
        type: event.type,
        severity: event.severity,
        affectedEntities: event.affectedEntities,
        title: event.title,
        description: event.description,
        metadata: event.metadata,
        timestamp: event.createdAt,
        processingTime: new Date().toISOString()
      }));

      // Use enhanced producer with batching and retry logic
      await this.producerService.sendBatch(topic, messages);

      logger.info(`Sent ${messages.length} events to Kafka topic: ${topic}`, {
        metrics: this.producerService.getMetrics()
      });

      return savedEvents;
    } catch (error) {
      logger.error('Error processing events:', error);
      throw error;
    }
  }

  async getMetrics() {
    return this.producerService.getMetrics();
  }

  async shutdown() {
    await this.producerService.disconnect();
  }
}

