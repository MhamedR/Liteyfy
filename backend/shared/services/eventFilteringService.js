import { Subscription, createLogger } from '../index.js';

const logger = createLogger('event-filtering-service');

/**
 * Sophisticated Event Filtering and Matching Service
 * Matches events to user subscriptions based on multiple criteria
 */
export class EventFilteringService {
  /**
   * Find all subscriptions affected by an event
   * @param {object} event - The event to match
   * @returns {Promise<array>} Array of matched subscriptions
   */
  async findAffectedSubscriptions(event) {
    try {
      const startTime = Date.now();
      const subscriptions = new Set();

      // Match by event type and affected entities
      for (const entity of event.affectedEntities || []) {
        const matched = await this.matchByEntity(event, entity);
        matched.forEach(sub => subscriptions.add(sub));
      }

      // Apply additional filters
      const filtered = await this.applyFilters(Array.from(subscriptions), event);

      const duration = Date.now() - startTime;
      logger.info('Event matching completed', {
        eventId: event._id,
        totalMatched: filtered.length,
        duration: `${duration}ms`
      });

      return filtered;
    } catch (error) {
      logger.error('Error finding affected subscriptions:', error);
      throw error;
    }
  }

  /**
   * Match subscriptions by entity type
   */
  async matchByEntity(event, entity) {
    const query = { active: true };

    switch (entity.type) {
      case 'TRAIN_LINE':
        return this.matchTrainLineSubscriptions(event, entity, query);

      case 'STATION':
        return this.matchStationSubscriptions(entity, query);

      case 'REGION':
        return this.matchWeatherSubscriptions(event, entity, query);

      case 'STIB_LINE':
        return this.matchStibSubscriptions(event, entity, query);

      default:
        logger.warn('Unknown entity type:', entity.type);
        return [];
    }
  }

  /**
   * Match train line subscriptions with delay filtering
   */
  async matchTrainLineSubscriptions(event, entity, baseQuery) {
    const query = {
      ...baseQuery,
      'trainLines': {
        $elemMatch: {
          lineId: entity.id,
          enabled: true
        }
      }
    };

    // Filter by event type
    if (event.type === 'TRAIN_DELAY') {
      query['trainLines.$elemMatch.notifyDelays'] = true;

      // Extract delay in minutes from event
      const delayMinutes = this.extractDelayMinutes(event);

      // Only match if delay exceeds user's threshold
      if (delayMinutes) {
        query['trainLines.$elemMatch.minDelayMinutes'] = { $lte: delayMinutes };
      }
    } else if (event.type === 'TRAIN_CANCELLATION') {
      query['trainLines.$elemMatch.notifyCancellations'] = true;
    } else if (event.type === 'PLATFORM_CHANGE') {
      query['trainLines.$elemMatch.notifyDelays'] = true;
    }

    const subscriptions = await Subscription.find(query);
    logger.debug('Train line subscriptions matched', {
      lineId: entity.id,
      eventType: event.type,
      count: subscriptions.length
    });

    return subscriptions;
  }

  /**
   * Match station subscriptions
   */
  async matchStationSubscriptions(entity, baseQuery) {
    const query = {
      ...baseQuery,
      'stations.stationId': entity.id,
      'stations.enabled': true
    };

    return Subscription.find(query);
  }

  /**
   * Match weather subscriptions with alert type filtering
   */
  async matchWeatherSubscriptions(event, entity, baseQuery) {
    const weatherAlertType = this.extractWeatherAlertType(event);

    const query = {
      ...baseQuery,
      'weatherRegions': {
        $elemMatch: {
          regionId: entity.id,
          enabled: true,
          alertTypes: weatherAlertType
        }
      }
    };

    const subscriptions = await Subscription.find(query);
    logger.debug('Weather subscriptions matched', {
      regionId: entity.id,
      alertType: weatherAlertType,
      count: subscriptions.length
    });

    return subscriptions;
  }

  /**
   * Match STIB subscriptions
   */
  async matchStibSubscriptions(event, entity, baseQuery) {
    const query = {
      ...baseQuery,
      'stibLines': {
        $elemMatch: {
          lineId: entity.id,
          enabled: true,
          notifyDisruptions: true
        }
      }
    };

    return Subscription.find(query);
  }

  /**
   * Apply additional filters to subscriptions
   */
  async applyFilters(subscriptions, event) {
    return subscriptions.filter(subscription => {
      // Filter by quiet hours
      if (!subscription.isNotificationAllowed(event.severity)) {
        logger.debug('Subscription filtered by quiet hours', {
          endpoint: subscription.endpoint,
          eventSeverity: event.severity
        });
        return false;
      }

      // Filter by language (if event has language-specific content)
      if (event.language && event.language !== subscription.language) {
        return false;
      }

      // Additional custom filters can be added here

      return true;
    });
  }

  /**
   * Extract delay in minutes from event metadata
   */
  extractDelayMinutes(event) {
    try {
      if (event.metadata?.departure?.delay) {
        return parseInt(event.metadata.departure.delay) / 60; // Convert seconds to minutes
      }

      // Try to extract from title (e.g., "Train - 15min delay")
      const match = event.title.match(/(\d+)\s*min/i);
      if (match) {
        return parseInt(match[1]);
      }

      return 0;
    } catch (error) {
      logger.warn('Failed to extract delay minutes:', error);
      return 0;
    }
  }

  /**
   * Extract weather alert type from event
   */
  extractWeatherAlertType(event) {
    const typeMapping = {
      'thunderstorm': 'THUNDERSTORM',
      'rain': 'HEAVY_RAIN',
      'snow': 'SNOW',
      'ice': 'ICE',
      'wind': 'WIND',
      'fog': 'FOG',
      'heat': 'HEAT',
      'cold': 'COLD'
    };

    const title = (event.title || '').toLowerCase();

    for (const [keyword, alertType] of Object.entries(typeMapping)) {
      if (title.includes(keyword)) {
        return alertType;
      }
    }

    return 'WEATHER_ALERT'; // Default
  }

  /**
   * Calculate relevance score for subscription-event pair
   * Higher score = more relevant
   */
  calculateRelevanceScore(subscription, event) {
    let score = 0;

    // Base score from event severity
    const severityScores = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'CRITICAL': 4
    };
    score += severityScores[event.severity] || 0;

    // Bonus for exact entity match
    if (event.affectedEntities) {
      for (const entity of event.affectedEntities) {
        if (this.hasExactMatch(subscription, entity)) {
          score += 2;
        }
      }
    }

    // Penalty for being in quiet hours (but still allowed for critical)
    if (!subscription.quietHours.enabled) {
      score += 1;
    }

    return score;
  }

  /**
   * Check if subscription has exact entity match
   */
  hasExactMatch(subscription, entity) {
    switch (entity.type) {
      case 'TRAIN_LINE':
        return subscription.trainLines.some(line => line.lineId === entity.id && line.enabled);
      case 'REGION':
        return subscription.weatherRegions.some(region => region.regionId === entity.id && region.enabled);
      case 'STIB_LINE':
        return subscription.stibLines.some(line => line.lineId === entity.id && line.enabled);
      default:
        return false;
    }
  }

  /**
   * Get matching statistics
   */
  async getMatchingStats(event) {
    const allSubscriptions = await Subscription.find({ active: true });
    const matchedSubscriptions = await this.findAffectedSubscriptions(event);

    return {
      totalActive: allSubscriptions.length,
      matched: matchedSubscriptions.length,
      matchRate: (matchedSubscriptions.length / allSubscriptions.length * 100).toFixed(2) + '%',
      byLanguage: this.groupByLanguage(matchedSubscriptions)
    };
  }

  /**
   * Group subscriptions by language
   */
  groupByLanguage(subscriptions) {
    return subscriptions.reduce((acc, sub) => {
      acc[sub.language] = (acc[sub.language] || 0) + 1;
      return acc;
    }, {});
  }
}

