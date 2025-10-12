import axios from 'axios';
import { createLogger, Event } from '../../../../shared/index.js';

const logger = createLogger('stib-data-adapter');

export class StibDataAdapter {
  constructor() {
    this.baseUrl = 'https://data.stib-mivb.brussels/api/explore/v2.1/catalog/datasets';
  }

  async fetchAndNormalize() {
    try {
      // Fetch STIB real-time data
      const response = await axios.get(`${this.baseUrl}/waitingtime-rt-production/records`, {
        params: { limit: 100 }
      });

      const events = [];
      const records = response.data?.results || [];

      // Look for disruptions (simplified - in production, use disruptions endpoint)
      const disruptedLines = {};

      for (const record of records) {
        const waitTime = parseInt(record.waittime) || 0;
        if (waitTime > 30) { // Abnormal wait time
          const lineId = record.lineid || 'unknown';
          if (!disruptedLines[lineId]) {
            disruptedLines[lineId] = {
              lineId,
              maxDelay: waitTime,
              stops: []
            };
          }
          disruptedLines[lineId].maxDelay = Math.max(disruptedLines[lineId].maxDelay, waitTime);
          disruptedLines[lineId].stops.push(record.stop);
        }
      }

      for (const [lineId, data] of Object.entries(disruptedLines)) {
        const event = {
          source: 'STIB',
          type: 'STIB_DISRUPTION',
          externalId: `${lineId}-${Date.now()}`,
          title: `Line ${lineId} - Delays`,
          description: `STIB Line ${lineId} experiencing delays up to ${data.maxDelay} minutes`,
          severity: data.maxDelay > 20 ? 'HIGH' : 'MEDIUM',
          affectedEntities: [{
            type: 'STIB_LINE',
            id: lineId,
            name: `Line ${lineId}`
          }],
          metadata: { disruption: data, apiSource: 'STIB-MIVB' },
          startTime: new Date(),
          processed: false
        };

        const exists = await Event.findOne({ source: event.source, externalId: event.externalId });
        if (!exists) {
          events.push(event);
        }
      }

      logger.info(`Fetched ${events.length} STIB events`);
      return events;
    } catch (error) {
      logger.error('Error fetching STIB data:', error);
      return [];
    }
  }
}

