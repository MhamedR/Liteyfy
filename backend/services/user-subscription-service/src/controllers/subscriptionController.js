import { SubscriptionService } from '../services/subscriptionService.js';
import { createLogger } from '../../../../shared/index.js';

const logger = createLogger('subscription-controller');

export class SubscriptionController {
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  async createOrUpdateSubscription(req, res, next) {
    try {
      const { endpoint, keys, userAgent, language, ...preferences } = req.body;

      if (!endpoint || !keys) {
        return res.status(400).json({ error: 'Endpoint and keys are required' });
      }

      const subscription = await this.subscriptionService.createOrUpdate({
        endpoint,
        keys,
        userAgent,
        language,
        ...preferences
      });

      res.status(subscription.isNew ? 201 : 200).json(subscription);
    } catch (error) {
      logger.error('Error creating/updating subscription:', error);
      next(error);
    }
  }

  async getSubscription(req, res, next) {
    try {
      const endpoint = decodeURIComponent(req.params.endpoint);
      const subscription = await this.subscriptionService.getByEndpoint(endpoint);

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      logger.error('Error getting subscription:', error);
      next(error);
    }
  }

  async updateTrainLines(req, res, next) {
    try {
      const endpoint = decodeURIComponent(req.params.endpoint);
      const { trainLines } = req.body;

      const subscription = await this.subscriptionService.updateTrainLines(endpoint, trainLines);

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      logger.error('Error updating train lines:', error);
      next(error);
    }
  }

  async removeTrainLine(req, res, next) {
    try {
      const endpoint = decodeURIComponent(req.params.endpoint);
      const { lineId } = req.params;

      const subscription = await this.subscriptionService.removeTrainLine(endpoint, lineId);

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      logger.error('Error removing train line:', error);
      next(error);
    }
  }

  async updateWeatherRegions(req, res, next) {
    try {
      const endpoint = decodeURIComponent(req.params.endpoint);
      const { weatherRegions } = req.body;

      const subscription = await this.subscriptionService.updateWeatherRegions(endpoint, weatherRegions);

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      logger.error('Error updating weather regions:', error);
      next(error);
    }
  }

  async removeWeatherRegion(req, res, next) {
    try {
      const endpoint = decodeURIComponent(req.params.endpoint);
      const { regionId } = req.params;

      const subscription = await this.subscriptionService.removeWeatherRegion(endpoint, regionId);

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      logger.error('Error removing weather region:', error);
      next(error);
    }
  }

  async updateStibLines(req, res, next) {
    try {
      const endpoint = decodeURIComponent(req.params.endpoint);
      const { stibLines } = req.body;

      const subscription = await this.subscriptionService.updateStibLines(endpoint, stibLines);

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      logger.error('Error updating STIB lines:', error);
      next(error);
    }
  }

  async removeStibLine(req, res, next) {
    try {
      const endpoint = decodeURIComponent(req.params.endpoint);
      const { lineId } = req.params;

      const subscription = await this.subscriptionService.removeStibLine(endpoint, lineId);

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      logger.error('Error removing STIB line:', error);
      next(error);
    }
  }

  async updateQuietHours(req, res, next) {
    try {
      const endpoint = decodeURIComponent(req.params.endpoint);
      const quietHours = req.body;

      const subscription = await this.subscriptionService.updateQuietHours(endpoint, quietHours);

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      logger.error('Error updating quiet hours:', error);
      next(error);
    }
  }

  async deleteSubscription(req, res, next) {
    try {
      const endpoint = decodeURIComponent(req.params.endpoint);
      const deleted = await this.subscriptionService.delete(endpoint);

      if (!deleted) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting subscription:', error);
      next(error);
    }
  }
}

