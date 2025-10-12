import { Kafka, logLevel } from 'kafkajs';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('kafka');

/**
 * Kafka connection configuration and helper
 */
export class KafkaConnection {
  constructor(options = {}) {
    this.brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    this.clientId = options.clientId || process.env.SERVICE_NAME || 'liteyfy-service';

    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
      logLevel: logLevel.INFO,
      retry: {
        initialRetryTime: 300,
        retries: 8
      },
      ...options
    });

    this.producer = null;
    this.consumer = null;
    this.admin = null;
  }

  /**
   * Create and connect producer
   */
  async createProducer() {
    try {
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000
      });

      await this.producer.connect();
      logger.info('Kafka producer connected successfully');

      return this.producer;
    } catch (error) {
      logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Create and connect consumer
   */
  async createConsumer(groupId, topics = []) {
    try {
      this.consumer = this.kafka.consumer({
        groupId: groupId || `${this.clientId}-group`,
        sessionTimeout: 30000,
        heartbeatInterval: 3000
      });

      await this.consumer.connect();
      logger.info('Kafka consumer connected successfully', { groupId });

      if (topics.length > 0) {
        await this.consumer.subscribe({ topics, fromBeginning: false });
        logger.info('Kafka consumer subscribed to topics', { topics });
      }

      return this.consumer;
    } catch (error) {
      logger.error('Failed to connect Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Create admin client
   */
  async createAdmin() {
    try {
      this.admin = this.kafka.admin();
      await this.admin.connect();
      logger.info('Kafka admin connected successfully');

      return this.admin;
    } catch (error) {
      logger.error('Failed to connect Kafka admin:', error);
      throw error;
    }
  }

  /**
   * Send message to topic
   */
  async sendMessage(topic, messages) {
    if (!this.producer) {
      throw new Error('Producer not initialized. Call createProducer() first.');
    }

    try {
      const result = await this.producer.send({
        topic,
        messages: Array.isArray(messages) ? messages : [messages]
      });

      logger.debug('Message sent successfully', { topic, result });
      return result;
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Disconnect all clients
   */
  async disconnect() {
    try {
      if (this.producer) {
        await this.producer.disconnect();
        logger.info('Kafka producer disconnected');
      }

      if (this.consumer) {
        await this.consumer.disconnect();
        logger.info('Kafka consumer disconnected');
      }

      if (this.admin) {
        await this.admin.disconnect();
        logger.info('Kafka admin disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting Kafka clients:', error);
      throw error;
    }
  }

  /**
   * Get producer instance
   */
  getProducer() {
    if (!this.producer) {
      throw new Error('Producer not initialized. Call createProducer() first.');
    }
    return this.producer;
  }

  /**
   * Get consumer instance
   */
  getConsumer() {
    if (!this.consumer) {
      throw new Error('Consumer not initialized. Call createConsumer() first.');
    }
    return this.consumer;
  }
}

export default KafkaConnection;

