import mongoose from 'mongoose';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('database');

/**
 * MongoDB connection configuration and helper
 */
export class DatabaseConnection {
  constructor(uri, options = {}) {
    this.uri = uri || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/liteyfy';
    this.options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ...options
    };
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      await mongoose.connect(this.uri, this.options);
      this.isConnected = true;
      logger.info('MongoDB connected successfully', {
        host: mongoose.connection.host,
        name: mongoose.connection.name
      });

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      return mongoose.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  checkConnection() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export default new DatabaseConnection();

