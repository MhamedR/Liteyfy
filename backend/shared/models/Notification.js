import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Notification Schema
 * Tracks sent notifications for analytics and retry logic
 */
const notificationSchema = new Schema({
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['TRAIN_DELAY', 'TRAIN_CANCELLATION', 'WEATHER_ALERT', 'STIB_DISRUPTION', 'PLATFORM_CHANGE'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED', 'RETRY'],
    default: 'PENDING',
    index: true
  },
  deliveredAt: Date,
  failedAt: Date,
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  response: Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for analytics and performance
notificationSchema.index({ type: 1, status: 1, createdAt: -1 });
notificationSchema.index({ subscriptionId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ status: 1, retryCount: 1 });

/**
 * Mark notification as sent
 */
notificationSchema.methods.markSent = function(response = {}) {
  this.status = 'SENT';
  this.deliveredAt = new Date();
  this.response = response;
  return this.save();
};

/**
 * Mark notification as failed
 */
notificationSchema.methods.markFailed = function(error) {
  this.status = 'FAILED';
  this.failedAt = new Date();
  this.errorMessage = error.message || String(error);
  return this.save();
};

/**
 * Increment retry count
 */
notificationSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  if (this.retryCount < this.maxRetries) {
    this.status = 'RETRY';
  } else {
    this.status = 'FAILED';
    this.failedAt = new Date();
  }
  return this.save();
};

/**
 * Check if notification should be retried
 */
notificationSchema.methods.shouldRetry = function() {
  return this.retryCount < this.maxRetries && this.status === 'RETRY';
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

