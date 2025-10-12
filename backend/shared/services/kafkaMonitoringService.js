import { createLogger } from '../utils/logger.js';

const logger = createLogger('kafka-monitoring');

/**
 * Kafka Monitoring and Health Check Service
 */
export class KafkaMonitoringService {
  constructor(kafkaConnection) {
    this.kafkaConnection = kafkaConnection;
    this.admin = null;
    this.metrics = {
      topicHealth: {},
      consumerLag: {},
      producerMetrics: {},
      lastCheck: null
    };
  }

  /**
   * Initialize admin client for monitoring
   */
  async initialize() {
    try {
      this.admin = await this.kafkaConnection.createAdmin();
      logger.info('Kafka monitoring initialized');
    } catch (error) {
      logger.error('Failed to initialize Kafka monitoring:', error);
      throw error;
    }
  }

  /**
   * Check health of all topics
   */
  async checkTopicsHealth() {
    try {
      const topics = await this.admin.listTopics();
      const health = {};

      for (const topic of topics) {
        const metadata = await this.admin.fetchTopicMetadata({ topics: [topic] });
        const topicMeta = metadata.topics[0];

        if (topicMeta) {
          health[topic] = {
            partitions: topicMeta.partitions.length,
            hasError: !!topicMeta.error,
            error: topicMeta.error,
            replicationFactor: topicMeta.partitions[0]?.replicas?.length || 0,
            inSyncReplicas: topicMeta.partitions[0]?.isr?.length || 0
          };
        }
      }

      this.metrics.topicHealth = health;
      this.metrics.lastCheck = new Date();

      logger.debug('Topics health check completed', { topics: topics.length });
      return health;
    } catch (error) {
      logger.error('Failed to check topics health:', error);
      throw error;
    }
  }

  /**
   * Get consumer group lag
   */
  async getConsumerLag(groupId) {
    try {
      const offsets = await this.admin.fetchOffsets({ groupId });
      const lag = {};

      for (const topic of offsets) {
        lag[topic.topic] = {
          partitions: topic.partitions.map(p => ({
            partition: p.partition,
            offset: p.offset,
            lag: p.lag || 0
          })),
          totalLag: topic.partitions.reduce((sum, p) => sum + (p.lag || 0), 0)
        };
      }

      this.metrics.consumerLag[groupId] = lag;
      return lag;
    } catch (error) {
      logger.error(`Failed to get consumer lag for group ${groupId}:`, error);
      return null;
    }
  }

  /**
   * Get comprehensive Kafka health status
   */
  async getHealthStatus() {
    try {
      const [topicHealth, clusterInfo] = await Promise.all([
        this.checkTopicsHealth(),
        this.getClusterInfo()
      ]);

      return {
        status: this.calculateOverallHealth(topicHealth),
        timestamp: new Date().toISOString(),
        cluster: clusterInfo,
        topics: topicHealth,
        consumerLags: this.metrics.consumerLag
      };
    } catch (error) {
      logger.error('Failed to get health status:', error);
      return {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get cluster information
   */
  async getClusterInfo() {
    try {
      const cluster = this.kafkaConnection.kafka.admin();
      const { brokers } = await cluster.describeCluster();

      return {
        brokers: brokers.length,
        brokersDetails: brokers.map(b => ({
          nodeId: b.nodeId,
          host: b.host,
          port: b.port
        }))
      };
    } catch (error) {
      logger.error('Failed to get cluster info:', error);
      return { brokers: 0, error: error.message };
    }
  }

  /**
   * Calculate overall health status
   */
  calculateOverallHealth(topicHealth) {
    const topics = Object.values(topicHealth);

    if (topics.length === 0) {
      return 'UNKNOWN';
    }

    const hasErrors = topics.some(t => t.hasError);
    const hasUnderReplication = topics.some(t => t.replicationFactor > t.inSyncReplicas);

    if (hasErrors) {
      return 'ERROR';
    } else if (hasUnderReplication) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }

  /**
   * Get metrics summary
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Monitor consumer lag and alert if threshold exceeded
   */
  async monitorConsumerLag(groupId, thresholdLag = 1000) {
    const lag = await this.getConsumerLag(groupId);

    if (lag) {
      for (const [topic, data] of Object.entries(lag)) {
        if (data.totalLag > thresholdLag) {
          logger.warn('High consumer lag detected', {
            groupId,
            topic,
            lag: data.totalLag,
            threshold: thresholdLag
          });
        }
      }
    }
  }

  /**
   * Disconnect monitoring
   */
  async disconnect() {
    if (this.admin) {
      await this.admin.disconnect();
      logger.info('Kafka monitoring disconnected');
    }
  }
}

