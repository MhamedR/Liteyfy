import mongoose from 'mongoose';

/**
 * User Consent Model for GDPR Compliance
 * Tracks user consent for data processing and notifications
 */
const userConsentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Consent tracking
  pushNotificationsConsent: {
    granted: { type: Boolean, default: false },
    grantedAt: { type: Date },
    revokedAt: { type: Date },
    ipAddress: { type: String },
    userAgent: { type: String }
  },

  // Data processing consent
  dataProcessingConsent: {
    granted: { type: Boolean, default: false },
    grantedAt: { type: Date },
    revokedAt: { type: Date },
    version: { type: String }, // Privacy policy version
    ipAddress: { type: String },
    userAgent: { type: String }
  },

  // Analytics consent (optional)
  analyticsConsent: {
    granted: { type: Boolean, default: false },
    grantedAt: { type: Date },
    revokedAt: { type: Date }
  },

  // Right to be forgotten
  deletionRequested: {
    type: Boolean,
    default: false
  },
  deletionRequestedAt: { type: Date },
  deletionScheduledFor: { type: Date }, // 30 days after request
  deletionCompletedAt: { type: Date },

  // Data export requests
  dataExportRequests: [{
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    downloadUrl: { type: String },
    expiresAt: { type: Date }
  }],

  // Audit trail
  consentHistory: [{
    action: { type: String, enum: ['GRANTED', 'REVOKED', 'UPDATED'] },
    consentType: { type: String },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: mongoose.Schema.Types.Mixed }
  }],

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date }
});

// Indexes for performance
userConsentSchema.index({ deletionScheduledFor: 1 });
userConsentSchema.index({ 'dataExportRequests.expiresAt': 1 });

// Methods
userConsentSchema.methods.grantPushNotificationConsent = function(metadata = {}) {
  this.pushNotificationsConsent = {
    granted: true,
    grantedAt: new Date(),
    revokedAt: null,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  };

  this.consentHistory.push({
    action: 'GRANTED',
    consentType: 'PUSH_NOTIFICATIONS',
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    details: metadata
  });

  this.updatedAt = Date.now();
  return this.save();
};

userConsentSchema.methods.revokePushNotificationConsent = function(metadata = {}) {
  this.pushNotificationsConsent.granted = false;
  this.pushNotificationsConsent.revokedAt = new Date();

  this.consentHistory.push({
    action: 'REVOKED',
    consentType: 'PUSH_NOTIFICATIONS',
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    details: metadata
  });

  this.updatedAt = Date.now();
  return this.save();
};

userConsentSchema.methods.requestDataDeletion = function() {
  this.deletionRequested = true;
  this.deletionRequestedAt = new Date();
  // Schedule deletion for 30 days later (grace period)
  this.deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  this.updatedAt = Date.now();
  return this.save();
};

userConsentSchema.methods.cancelDeletionRequest = function() {
  this.deletionRequested = false;
  this.deletionRequestedAt = null;
  this.deletionScheduledFor = null;
  this.updatedAt = Date.now();
  return this.save();
};

userConsentSchema.methods.hasValidConsent = function() {
  return this.pushNotificationsConsent.granted &&
         this.dataProcessingConsent.granted &&
         !this.deletionRequested;
};

const UserConsent = mongoose.model('UserConsent', userConsentSchema);

export default UserConsent;

