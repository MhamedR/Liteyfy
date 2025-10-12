import { Subscription, createLogger, validate, ValidationSchemas } from '../../../../shared/index.js';

const logger = createLogger('subscription-service');

export class SubscriptionService {
  async createOrUpdate(data) {
    try {
      const { endpoint } = data;

      let subscription = await Subscription.findOne({ endpoint });
      const isNew = !subscription;

      if (subscription) {
        // Update existing subscription
        Object.assign(subscription, data);
        await subscription.markSeen();
      } else {
        // Create new subscription
        subscription = new Subscription(data);
        await subscription.save();
        logger.info('New subscription created', { endpoint });
      }

      return { ...subscription.toObject(), isNew };
    } catch (error) {
      logger.error('Error in createOrUpdate:', error);
      throw error;
    }
  }

  async getByEndpoint(endpoint) {
    try {
      const subscription = await Subscription.findOne({ endpoint });
      if (subscription) {
        await subscription.markSeen();
      }
      return subscription;
    } catch (error) {
      logger.error('Error in getByEndpoint:', error);
      throw error;
    }
  }

  async updateTrainLines(endpoint, trainLines) {
    try {
      const subscription = await Subscription.findOne({ endpoint });
      if (!subscription) return null;

      subscription.trainLines = trainLines;
      await subscription.save();
      logger.info('Train lines updated', { endpoint, count: trainLines.length });

      return subscription;
    } catch (error) {
      logger.error('Error in updateTrainLines:', error);
      throw error;
    }
  }

  async removeTrainLine(endpoint, lineId) {
    try {
      const subscription = await Subscription.findOne({ endpoint });
      if (!subscription) return null;

      subscription.trainLines = subscription.trainLines.filter(line => line.lineId !== lineId);
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error('Error in removeTrainLine:', error);
      throw error;
    }
  }

  async updateWeatherRegions(endpoint, weatherRegions) {
    try {
      const subscription = await Subscription.findOne({ endpoint });
      if (!subscription) return null;

      subscription.weatherRegions = weatherRegions;
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error('Error in updateWeatherRegions:', error);
      throw error;
    }
  }

  async removeWeatherRegion(endpoint, regionId) {
    try {
      const subscription = await Subscription.findOne({ endpoint });
      if (!subscription) return null;

      subscription.weatherRegions = subscription.weatherRegions.filter(region => region.regionId !== regionId);
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error('Error in removeWeatherRegion:', error);
      throw error;
    }
  }

  async updateStibLines(endpoint, stibLines) {
    try {
      const subscription = await Subscription.findOne({ endpoint });
      if (!subscription) return null;

      subscription.stibLines = stibLines;
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error('Error in updateStibLines:', error);
      throw error;
    }
  }

  async removeStibLine(endpoint, lineId) {
    try {
      const subscription = await Subscription.findOne({ endpoint });
      if (!subscription) return null;

      subscription.stibLines = subscription.stibLines.filter(line => line.lineId !== lineId);
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error('Error in removeStibLine:', error);
      throw error;
    }
  }

  async updateQuietHours(endpoint, quietHours) {
    try {
      const subscription = await Subscription.findOne({ endpoint });
      if (!subscription) return null;

      subscription.quietHours = { ...subscription.quietHours, ...quietHours };
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error('Error in updateQuietHours:', error);
      throw error;
    }
  }

  async delete(endpoint) {
    try {
      const result = await Subscription.deleteOne({ endpoint });
      logger.info('Subscription deleted', { endpoint });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  }

  async findByLineId(lineId) {
    return Subscription.find({
      'trainLines.lineId': lineId,
      'trainLines.enabled': true,
      active: true
    });
  }

  async findByRegionId(regionId) {
    return Subscription.find({
      'weatherRegions.regionId': regionId,
      'weatherRegions.enabled': true,
      active: true
    });
  }

  async findByStibLineId(lineId) {
    return Subscription.find({
      'stibLines.lineId': lineId,
      'stibLines.enabled': true,
      active: true
    });
  }
}

