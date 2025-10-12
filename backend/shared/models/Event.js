import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Event Schema
 * Stores raw events from external APIs for processing
 */
const eventSchema = new Schema({
  source: {
    type: String,
    enum: ['IRAIL', 'STIB', 'KMI'],
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['TRAIN_DELAY', 'TRAIN_CANCELLATION', 'WEATHER_ALERT', 'STIB_DISRUPTION', 'PLATFORM_CHANGE'],
    required: true,
    index: true
  },
  externalId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
    index: true
  },
  affectedEntities: [{
    type: {
      type: String,
      enum: ['TRAIN_LINE', 'STATION', 'REGION', 'STIB_LINE']
    },
    id: String,
    name: String
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  startTime: Date,
  endTime: Date,
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  processedAt: Date,
  notificationsSent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
eventSchema.index({ source: 1, externalId: 1 }, { unique: true });
eventSchema.index({ type: 1, processed: 1, createdAt: -1 });
eventSchema.index({ 'affectedEntities.id': 1, processed: 1 });
eventSchema.index({ severity: 1, processed: 1, createdAt: -1 });

/**
 * Mark event as processed
 */
eventSchema.methods.markProcessed = function(notificationCount = 0) {
  this.processed = true;
  this.processedAt = new Date();
  this.notificationsSent = notificationCount;
  return this.save();
};

/**
 * Get affected entity IDs by type
 */
eventSchema.methods.getAffectedIds = function(entityType) {
  return this.affectedEntities
    .filter(entity => entity.type === entityType)
    .map(entity => entity.id);
};

const Event = mongoose.model('Event', eventSchema);

export default Event;

