import { Subscription, Notification, Event, redis, createLogger } from '../../../../shared/index.js';

const logger = createLogger('analytics-service');

export class AnalyticsService {
  async getNotificationMetrics(options = {}) {
    try {
      const cacheKey = `metrics:notifications:${JSON.stringify(options)}`;
      const cached = await redis.getClient().get(cacheKey);

      if (cached) {
        logger.debug('Returning cached metrics');
        return JSON.parse(cached);
      }

      const { startDate, endDate, groupBy = 'day' } = options;
      const match = {};

      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }

      const [totalStats, statusBreakdown, typeBreakdown] = await Promise.all([
        Notification.countDocuments(match),
        Notification.aggregate([
          { $match: match },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Notification.aggregate([
          { $match: match },
          { $group: { _id: '$type', count: { $sum: 1 }, avgRetries: { $avg: '$retryCount' } } }
        ])
      ]);

      const metrics = {
        total: totalStats,
        byStatus: statusBreakdown,
        byType: typeBreakdown,
        successRate: ((statusBreakdown.find(s => s._id === 'SENT')?.count || 0) / totalStats * 100).toFixed(2)
      };

      // Cache for 5 minutes
      await redis.getClient().set(cacheKey, JSON.stringify(metrics), { EX: 300 });

      return metrics;
    } catch (error) {
      logger.error('Error getting notification metrics:', error);
      throw error;
    }
  }

  async getSubscriptionStats() {
    try {
      const cacheKey = 'metrics:subscriptions:stats';
      const cached = await redis.getClient().get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const [total, active, languageBreakdown] = await Promise.all([
        Subscription.countDocuments(),
        Subscription.countDocuments({ active: true }),
        Subscription.aggregate([
          { $group: { _id: '$language', count: { $sum: 1 } } }
        ])
      ]);

      const stats = {
        total,
        active,
        inactive: total - active,
        byLanguage: languageBreakdown
      };

      // Cache for 10 minutes
      await redis.getClient().set(cacheKey, JSON.stringify(stats), { EX: 600 });

      return stats;
    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      throw error;
    }
  }

  async getEventStats(options = {}) {
    try {
      const { startDate, endDate } = options;
      const match = {};

      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }

      const [totalEvents, processed, bySource, bySeverity] = await Promise.all([
        Event.countDocuments(match),
        Event.countDocuments({ ...match, processed: true }),
        Event.aggregate([
          { $match: match },
          { $group: { _id: '$source', count: { $sum: 1 } } }
        ]),
        Event.aggregate([
          { $match: match },
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ])
      ]);

      return {
        total: totalEvents,
        processed,
        pending: totalEvents - processed,
        bySource,
        bySeverity
      };
    } catch (error) {
      logger.error('Error getting event stats:', error);
      throw error;
    }
  }

  async getPerformanceMetrics() {
    try {
      const [avgDeliveryTime, failureRate] = await Promise.all([
        Notification.aggregate([
          { $match: { status: 'SENT', deliveredAt: { $exists: true } } },
          {
            $project: {
              deliveryTime: { $subtract: ['$deliveredAt', '$createdAt'] }
            }
          },
          { $group: { _id: null, avgTime: { $avg: '$deliveryTime' } } }
        ]),
        Notification.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } }
            }
          },
          {
            $project: {
              failureRate: { $multiply: [{ $divide: ['$failed', '$total'] }, 100] }
            }
          }
        ])
      ]);

      return {
        avgDeliveryTimeMs: avgDeliveryTime[0]?.avgTime || 0,
        failureRate: failureRate[0]?.failureRate || 0
      };
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }
}

