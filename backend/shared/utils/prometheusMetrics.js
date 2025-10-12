import { register, Counter, Histogram, Gauge } from 'prom-client';
import { createLogger } from './logger.js';

const logger = createLogger('prometheus-metrics');

/**
 * Prometheus Metrics Setup for Liteyfy Services
 */
export class PrometheusMetrics {
  constructor(serviceName) {
    this.serviceName = serviceName;

    // Enable default metrics (CPU, memory, etc.)
    register.setDefaultLabels({
      service: serviceName
    });

    // Initialize custom metrics
    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status']
    });

    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections'
    });

    this.kafkaMessagesProduced = new Counter({
      name: 'kafka_messages_produced_total',
      help: 'Total Kafka messages produced',
      labelNames: ['topic']
    });

    this.kafkaMessagesConsumed = new Counter({
      name: 'kafka_messages_consumed_total',
      help: 'Total Kafka messages consumed',
      labelNames: ['topic', 'group']
    });

    this.kafkaConsumerLag = new Gauge({
      name: 'kafka_consumer_lag',
      help: 'Kafka consumer group lag',
      labelNames: ['topic', 'partition', 'group']
    });

    this.databaseQueries = new Counter({
      name: 'database_queries_total',
      help: 'Total database queries',
      labelNames: ['operation', 'collection']
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'collection'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1]
    });

    this.notificationsSent = new Counter({
      name: 'notifications_sent_total',
      help: 'Total notifications sent',
      labelNames: ['type', 'status']
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['operation']
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['operation']
    });

    logger.info(`Prometheus metrics initialized for ${serviceName}`);
  }

  /**
   * Express middleware to track HTTP metrics
   */
  httpMiddleware() {
    return (req, res, next) => {
      const start = Date.now();

      this.activeConnections.inc();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;

        this.httpRequests.inc({
          method: req.method,
          path: this.normalizePath(req.path),
          status: res.statusCode
        });

        this.httpDuration.observe({
          method: req.method,
          path: this.normalizePath(req.path)
        }, duration);

        this.activeConnections.dec();
      });

      next();
    };
  }

  /**
   * Normalize path to avoid high cardinality
   * /api/users/123 -> /api/users/:id
   */
  normalizePath(path) {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId');
  }

  /**
   * Record Kafka message production
   */
  recordKafkaProduced(topic, count = 1) {
    this.kafkaMessagesProduced.inc({ topic }, count);
  }

  /**
   * Record Kafka message consumption
   */
  recordKafkaConsumed(topic, group, count = 1) {
    this.kafkaMessagesConsumed.inc({ topic, group }, count);
  }

  /**
   * Update Kafka consumer lag
   */
  updateConsumerLag(topic, partition, group, lag) {
    this.kafkaConsumerLag.set({ topic, partition, group }, lag);
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(operation, collection, durationMs) {
    this.databaseQueries.inc({ operation, collection });
    this.databaseQueryDuration.observe({ operation, collection }, durationMs / 1000);
  }

  /**
   * Record notification sent
   */
  recordNotificationSent(type, status) {
    this.notificationsSent.inc({ type, status });
  }

  /**
   * Record cache hit
   */
  recordCacheHit(operation) {
    this.cacheHits.inc({ operation });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(operation) {
    this.cacheMisses.inc({ operation });
  }

  /**
   * Get metrics endpoint handler
   */
  getMetricsHandler() {
    return async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        logger.error('Error generating metrics:', error);
        res.status(500).end();
      }
    };
  }

  /**
   * Get registry for custom metrics
   */
  getRegister() {
    return register;
  }
}

// Export singleton instances for each service
const metricsInstances = new Map();

export function getMetrics(serviceName) {
  if (!metricsInstances.has(serviceName)) {
    metricsInstances.set(serviceName, new PrometheusMetrics(serviceName));
  }
  return metricsInstances.get(serviceName);
}

