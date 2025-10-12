import { Event, createLogger } from '../../../../shared/index.js';
import { EventFilteringService } from '../../../../shared/services/eventFilteringService.js';

const logger = createLogger('event-consumer');

export class EventConsumer {
  constructor(kafkaConnection, notificationService) {
    this.kafkaConnection = kafkaConnection;
    this.notificationService = notificationService;
    this.filteringService = new EventFilteringService();
  }

  async start() {
    const consumer = this.kafkaConnection.getConsumer();

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const eventData = JSON.parse(message.value.toString());
          logger.info('Received event from Kafka', { topic, eventId: eventData.eventId });

          await this.processEvent(eventData);
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      }
    });

    logger.info('Event consumer started');
  }

  async processEvent(eventData) {
    try {
      const event = await Event.findById(eventData.eventId);
      if (!event || event.processed) {
        logger.debug('Event already processed or not found', { eventId: eventData.eventId });
        return;
      }

      // Use sophisticated filtering service
      const subscriptions = await this.filteringService.findAffectedSubscriptions(event);
      logger.info(`Found ${subscriptions.length} affected subscriptions`, { eventId: event._id });

      if (subscriptions.length === 0) {
        await event.markProcessed(0);
        return;
      }

      // Get matching statistics
      const stats = await this.filteringService.getMatchingStats(event);
      logger.debug('Matching statistics:', stats);

      // Prepare notification payload
      const payload = {
        type: event.type,
        priority: event.severity,
        title: event.title,
        message: event.description,
        data: {
          eventId: event._id.toString(),
          source: event.source,
          affectedEntities: event.affectedEntities,
          timestamp: event.createdAt
        }
      };

      // Send notifications
      const results = await this.notificationService.sendBulkNotifications(subscriptions, payload);

      // Mark event as processed
      await event.markProcessed(results.success);

      logger.info('Event processing completed', {
        eventId: event._id,
        notificationsSent: results.success,
        failed: results.failed,
        matchRate: stats.matchRate
      });
    } catch (error) {
      logger.error('Error processing event:', error);
      throw error;
    }
  }

}

