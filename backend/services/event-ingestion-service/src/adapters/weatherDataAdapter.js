import axios from 'axios';
import { createLogger, Event } from '../../../../shared/index.js';

const logger = createLogger('weather-data-adapter');

export class WeatherDataAdapter {
  constructor() {
    this.baseUrl = 'https://opendata.meteo.be/service/warning/bel'; // KMI/IRM API
  }

  async fetchAndNormalize() {
    try {
      const response = await axios.get(this.baseUrl, {
        headers: { 'Accept': 'application/json' }
      });

      const events = [];
      const warnings = response.data?.warnings || [];

      for (const warning of warnings) {
        const event = {
          source: 'KMI',
          type: 'WEATHER_ALERT',
          externalId: `${warning.id || warning.event}-${warning.region}`,
          title: warning.event || 'Weather Alert',
          description: warning.headline || warning.description || 'Weather warning issued',
          severity: this.mapSeverity(warning.severity),
          affectedEntities: [{
            type: 'REGION',
            id: warning.region || 'belgium',
            name: warning.areaDesc || 'Belgium'
          }],
          metadata: { warning, apiSource: 'KMI/IRM' },
          startTime: warning.effective ? new Date(warning.effective) : new Date(),
          endTime: warning.expires ? new Date(warning.expires) : null,
          processed: false
        };

        const exists = await Event.findOne({ source: event.source, externalId: event.externalId });
        if (!exists) {
          events.push(event);
        }
      }

      logger.info(`Fetched ${events.length} weather events`);
      return events;
    } catch (error) {
      logger.error('Error fetching weather data:', error);
      return [];
    }
  }

  mapSeverity(severity) {
    switch (severity?.toLowerCase()) {
      case 'extreme': return 'CRITICAL';
      case 'severe': return 'HIGH';
      case 'moderate': return 'MEDIUM';
      default: return 'LOW';
    }
  }
}

