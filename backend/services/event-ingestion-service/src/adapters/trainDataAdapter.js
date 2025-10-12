import axios from 'axios';
import { createLogger, Event } from '../../../../shared/index.js';

const logger = createLogger('train-data-adapter');

export class TrainDataAdapter {
  constructor() {
    this.baseUrl = 'https://api.irail.be';
  }

  async fetchAndNormalize() {
    try {
      // Fetch liveboard data from iRail API
      const response = await axios.get(`${this.baseUrl}/liveboard/`, {
        params: {
          station: 'Brussels-Central',
          format: 'json',
          lang: 'en'
        }
      });

      const events = [];
      const departures = response.data?.departures?.departure || [];

      for (const departure of departures) {
        const delay = parseInt(departure.delay) || 0;

        if (delay > 300) { // More than 5 minutes
          const event = {
            source: 'IRAIL',
            type: departure.canceled === '1' ? 'TRAIN_CANCELLATION' : 'TRAIN_DELAY',
            externalId: `${departure.id}-${Date.now()}`,
            title: `${departure.station} - ${delay / 60}min delay`,
            description: `Train to ${departure.station} delayed by ${delay / 60} minutes`,
            severity: delay > 900 ? 'HIGH' : delay > 600 ? 'MEDIUM' : 'LOW',
            affectedEntities: [{
              type: 'TRAIN_LINE',
              id: departure.vehicle,
              name: departure.vehicle
            }],
            metadata: { departure: departure, apiSource: 'iRail' },
            startTime: new Date(),
            processed: false
          };

          // Check if event already exists
          const exists = await Event.findOne({ source: event.source, externalId: event.externalId });
          if (!exists) {
            events.push(event);
          }
        }
      }

      logger.info(`Fetched ${events.length} train events`);
      return events;
    } catch (error) {
      logger.error('Error fetching train data:', error);
      return [];
    }
  }
}

