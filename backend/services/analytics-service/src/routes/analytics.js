import express from 'express';
import { AnalyticsService } from '../services/analyticsService.js';

const router = express.Router();
const analyticsService = new AnalyticsService();

// Get notification metrics
router.get('/notifications/metrics', async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const metrics = await analyticsService.getNotificationMetrics({ startDate, endDate, groupBy });
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

// Get subscription stats
router.get('/subscriptions/stats', async (req, res, next) => {
  try {
    const stats = await analyticsService.getSubscriptionStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Get event stats
router.get('/events/stats', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await analyticsService.getEventStats({ startDate, endDate });
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Get performance metrics
router.get('/performance', async (req, res, next) => {
  try {
    const metrics = await analyticsService.getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

export default router;

