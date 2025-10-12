import { createClient } from 'redis';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('redis');

/**
 * Redis connection configuration and helper
 */
export class RedisConnection {
  constructor(options = {}) {
    this.options = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Too many Redis reconnection attempts');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 50, 500);
        }
      },
      ...options
    };
    this.client = null;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      this.client = createClient(this.options);

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
      });

      await this.client.connect();
      logger.info('Redis connected successfully');

      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        logger.info('Redis disconnected gracefully');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Get client instance
   */
  getClient() {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }
}

export default new RedisConnection();

