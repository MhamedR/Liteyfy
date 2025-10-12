import { createLogger } from '../utils/logger.js';

const logger = createLogger('kafka-producer-service');

/**
 * Advanced Kafka Producer Service with batching, error handling, and monitoring
 */
export class KafkaProducerService {
  constructor(kafkaConnection) {
    this.kafkaConnection = kafkaConnection;
    this.producer = null;
    this.messageQueue = [];
    this.batchSize = 100;
    this.batchTimeout = 5000; // 5 seconds
    this.metrics = {
      sent: 0,
      failed: 0,
      retried: 0
    };
  }

  /**
   * Initialize producer
   */
  async initialize() {
    try {
      this.producer = await this.kafkaConnection.createProducer();
      logger.info('Kafka producer initialized successfully');

      // Start batch processor
      this.startBatchProcessor();
    } catch (error) {
      logger.error('Failed to initialize Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Send a single message to a topic
   * @param {string} topic - Kafka topic
   * @param {object} message - Message payload
   * @param {object} options - Additional options (key, partition, headers)
   */
  async sendMessage(topic, message, options = {}) {
    try {
      const kafkaMessage = this.formatMessage(message, options);

      const result = await this.producer.send({
        topic,
        messages: [kafkaMessage],
        compression: 1 // Snappy compression
      });

      this.metrics.sent++;
      logger.debug('Message sent successfully', { topic, partition: result[0].partition });

      return result;
    } catch (error) {
      this.metrics.failed++;
      logger.error('Failed to send message:', { topic, error: error.message });

      // Retry logic
      if (options.retry !== false) {
        return this.retryMessage(topic, message, options);
      }

      throw error;
    }
  }

  /**
   * Send multiple messages in batch
   * @param {string} topic - Kafka topic
   * @param {array} messages - Array of message payloads
   */
  async sendBatch(topic, messages) {
    try {
      const kafkaMessages = messages.map(msg => this.formatMessage(msg));

      const result = await this.producer.send({
        topic,
        messages: kafkaMessages,
        compression: 1
      });

      this.metrics.sent += messages.length;
      logger.info('Batch sent successfully', { topic, count: messages.length });

      return result;
    } catch (error) {
      this.metrics.failed += messages.length;
      logger.error('Failed to send batch:', { topic, count: messages.length, error: error.message });
      throw error;
    }
  }

  /**
   * Add message to queue for batch processing
   * @param {string} topic - Kafka topic
   * @param {object} message - Message payload
   */
  queueMessage(topic, message, options = {}) {
    this.messageQueue.push({
      topic,
      message: this.formatMessage(message, options),
      timestamp: Date.now()
    });

    // Flush if batch size reached
    if (this.messageQueue.length >= this.batchSize) {
      this.flushQueue();
    }
  }

  /**
   * Format message for Kafka
   */
  formatMessage(payload, options = {}) {
    const message = {
      value: JSON.stringify(payload),
      timestamp: Date.now().toString()
    };

    if (options.key) {
      message.key = options.key;
    }

    if (options.partition !== undefined) {
      message.partition = options.partition;
    }

    if (options.headers) {
      message.headers = options.headers;
    }

    return message;
  }

  /**
   * Retry failed message
   */
  async retryMessage(topic, message, options, attempt = 1, maxAttempts = 3) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff

    logger.warn(`Retrying message (attempt ${attempt}/${maxAttempts})`, { topic, delay });

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      this.metrics.retried++;
      return await this.sendMessage(topic, message, { ...options, retry: false });
    } catch (error) {
      if (attempt < maxAttempts) {
        return this.retryMessage(topic, message, options, attempt + 1, maxAttempts);
      }

      // Send to Dead Letter Queue
      await this.sendToDLQ(topic, message, error);
      throw error;
    }
  }

  /**
   * Send failed message to Dead Letter Queue
   */
  async sendToDLQ(originalTopic, message, error) {
    try {
      await this.sendMessage('notification-dlq', {
        originalTopic,
        message,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { retry: false });

      logger.info('Message sent to DLQ', { originalTopic });
    } catch (dlqError) {
      logger.error('Failed to send message to DLQ:', dlqError);
    }
  }

  /**
   * Start batch processor
   */
  startBatchProcessor() {
    setInterval(() => {
      if (this.messageQueue.length > 0) {
        this.flushQueue();
      }
    }, this.batchTimeout);
  }

  /**
   * Flush message queue
   */
  async flushQueue() {
    if (this.messageQueue.length === 0) return;

    const batch = this.messageQueue.splice(0);
    const groupedByTopic = {};

    // Group messages by topic
    for (const item of batch) {
      if (!groupedByTopic[item.topic]) {
        groupedByTopic[item.topic] = [];
      }
      groupedByTopic[item.topic].push(item.message);
    }

    // Send batches per topic
    const promises = Object.entries(groupedByTopic).map(([topic, messages]) =>
      this.sendBatch(topic, messages).catch(error => {
        logger.error(`Failed to flush batch for topic ${topic}:`, error);
      })
    );

    await Promise.allSettled(promises);
    logger.debug('Message queue flushed', { processed: batch.length });
  }

  /**
   * Get producer metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.messageQueue.length,
      successRate: this.metrics.sent / (this.metrics.sent + this.metrics.failed) * 100
    };
  }

  /**
   * Disconnect producer
   */
  async disconnect() {
    await this.flushQueue();
    await this.producer.disconnect();
    logger.info('Kafka producer disconnected');
  }
}

