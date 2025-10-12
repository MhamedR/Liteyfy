import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * User Subscription Schema
 * Stores user preferences and push notification endpoints
 */
const subscriptionSchema = new Schema({
  endpoint: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  userAgent: String,
  trainLines: [{
    lineId: { type: String, required: true },
    lineName: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    notifyDelays: { type: Boolean, default: true },
    notifyCancellations: { type: Boolean, default: true },
    minDelayMinutes: { type: Number, default: 5 }
  }],
  stations: [{
    stationId: { type: String, required: true },
    stationName: { type: String, required: true },
    enabled: { type: Boolean, default: true }
  }],
  weatherRegions: [{
    regionId: { type: String, required: true },
    regionName: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    alertTypes: [{ type: String }]
  }],
  stibLines: [{
    lineId: { type: String, required: true },
    lineName: { type: String, required: true },
    lineType: { type: String, enum: ['METRO', 'TRAM', 'BUS'], required: true },
    enabled: { type: Boolean, default: true },
    notifyDisruptions: { type: Boolean, default: true }
  }],
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: '22:00' },
    endTime: { type: String, default: '07:00' },
    allowCritical: { type: Boolean, default: true }
  },
  language: {
    type: String,
    enum: ['en', 'fr', 'nl'],
    default: 'en'
  },
  active: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
subscriptionSchema.index({ 'trainLines.lineId': 1, active: 1 });
subscriptionSchema.index({ 'weatherRegions.regionId': 1, active: 1 });
subscriptionSchema.index({ 'stibLines.lineId': 1, active: 1 });
subscriptionSchema.index({ lastSeen: 1 });

/**
 * Mark subscription as seen (update lastSeen)
 */
subscriptionSchema.methods.markSeen = function() {
  this.lastSeen = new Date();
  return this.save();
};

/**
 * Check if notifications are allowed at current time (quiet hours)
 */
subscriptionSchema.methods.isNotificationAllowed = function(priority = 'MEDIUM') {
  if (!this.quietHours.enabled) return true;
  if (priority === 'CRITICAL' && this.quietHours.allowCritical) return true;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const { startTime, endTime } = this.quietHours;

  if (startTime < endTime) {
    return currentTime < startTime || currentTime >= endTime;
  } else {
    return currentTime < startTime && currentTime >= endTime;
  }
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;

