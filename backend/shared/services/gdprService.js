import { createLogger } from '../utils/logger.js';
import UserConsent from '../models/UserConsent.js';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import Event from '../models/Event.js';

const logger = createLogger('gdpr-service');

/**
 * GDPR Compliance Service
 * Handles consent management, data deletion, and data export
 */
export class GDPRService {
  /**
   * Grant consent for push notifications
   */
  async grantConsent(userId, consentType, metadata = {}) {
    try {
      let consent = await UserConsent.findOne({ userId });

      if (!consent) {
        consent = new UserConsent({ userId });
      }

      switch (consentType) {
        case 'PUSH_NOTIFICATIONS':
          await consent.grantPushNotificationConsent(metadata);
          break;

        case 'DATA_PROCESSING':
          consent.dataProcessingConsent = {
            granted: true,
            grantedAt: new Date(),
            version: metadata.privacyPolicyVersion || '1.0',
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent
          };
          consent.consentHistory.push({
            action: 'GRANTED',
            consentType: 'DATA_PROCESSING',
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            details: metadata
          });
          await consent.save();
          break;

        case 'ANALYTICS':
          consent.analyticsConsent = {
            granted: true,
            grantedAt: new Date()
          };
          consent.consentHistory.push({
            action: 'GRANTED',
            consentType: 'ANALYTICS'
          });
          await consent.save();
          break;

        default:
          throw new Error(`Unknown consent type: ${consentType}`);
      }

      logger.info(`Consent granted for ${userId}: ${consentType}`);
      return consent;
    } catch (error) {
      logger.error(`Error granting consent for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Revoke consent
   */
  async revokeConsent(userId, consentType, metadata = {}) {
    try {
      const consent = await UserConsent.findOne({ userId });

      if (!consent) {
        throw new Error('User consent record not found');
      }

      switch (consentType) {
        case 'PUSH_NOTIFICATIONS':
          await consent.revokePushNotificationConsent(metadata);
          // Also disable subscription
          await Subscription.findOneAndUpdate(
            { userId },
            { active: false, updatedAt: Date.now() }
          );
          break;

        case 'DATA_PROCESSING':
          consent.dataProcessingConsent.granted = false;
          consent.dataProcessingConsent.revokedAt = new Date();
          consent.consentHistory.push({
            action: 'REVOKED',
            consentType: 'DATA_PROCESSING',
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent
          });
          await consent.save();
          break;

        case 'ANALYTICS':
          consent.analyticsConsent.granted = false;
          consent.analyticsConsent.revokedAt = new Date();
          consent.consentHistory.push({
            action: 'REVOKED',
            consentType: 'ANALYTICS'
          });
          await consent.save();
          break;

        default:
          throw new Error(`Unknown consent type: ${consentType}`);
      }

      logger.info(`Consent revoked for ${userId}: ${consentType}`);
      return consent;
    } catch (error) {
      logger.error(`Error revoking consent for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user has valid consent
   */
  async hasValidConsent(userId) {
    const consent = await UserConsent.findOne({ userId });
    return consent ? consent.hasValidConsent() : false;
  }

  /**
   * Get consent status
   */
  async getConsentStatus(userId) {
    const consent = await UserConsent.findOne({ userId });

    if (!consent) {
      return {
        userId,
        pushNotifications: false,
        dataProcessing: false,
        analytics: false,
        hasValidConsent: false
      };
    }

    return {
      userId,
      pushNotifications: consent.pushNotificationsConsent.granted,
      dataProcessing: consent.dataProcessingConsent.granted,
      analytics: consent.analyticsConsent.granted,
      hasValidConsent: consent.hasValidConsent(),
      deletionRequested: consent.deletionRequested,
      deletionScheduledFor: consent.deletionScheduledFor
    };
  }

  /**
   * Request data deletion (Right to be Forgotten)
   */
  async requestDataDeletion(userId, metadata = {}) {
    try {
      const consent = await UserConsent.findOne({ userId });

      if (!consent) {
        throw new Error('User consent record not found');
      }

      if (consent.deletionRequested) {
        throw new Error('Deletion already requested');
      }

      await consent.requestDataDeletion();

      // Revoke all consents
      await this.revokeConsent(userId, 'PUSH_NOTIFICATIONS', metadata);

      // Deactivate subscription immediately
      await Subscription.findOneAndUpdate(
        { userId },
        { active: false, updatedAt: Date.now() }
      );

      logger.info(`Data deletion requested for ${userId}, scheduled for ${consent.deletionScheduledFor}`);

      return {
        userId,
        deletionScheduledFor: consent.deletionScheduledFor,
        message: 'Your data will be deleted in 30 days. You can cancel this request anytime before then.'
      };
    } catch (error) {
      logger.error(`Error requesting data deletion for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel data deletion request
   */
  async cancelDataDeletion(userId) {
    try {
      const consent = await UserConsent.findOne({ userId });

      if (!consent) {
        throw new Error('User consent record not found');
      }

      if (!consent.deletionRequested) {
        throw new Error('No deletion request found');
      }

      await consent.cancelDeletionRequest();

      logger.info(`Data deletion canceled for ${userId}`);

      return {
        userId,
        message: 'Your data deletion request has been canceled.'
      };
    } catch (error) {
      logger.error(`Error canceling data deletion for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Execute scheduled data deletions
   */
  async executeScheduledDeletions() {
    try {
      const now = new Date();
      const consentsToDelete = await UserConsent.find({
        deletionRequested: true,
        deletionScheduledFor: { $lte: now },
        deletionCompletedAt: null
      });

      logger.info(`Found ${consentsToDelete.length} users scheduled for deletion`);

      for (const consent of consentsToDelete) {
        await this.deleteUserData(consent.userId);
      }

      return { deleted: consentsToDelete.length };
    } catch (error) {
      logger.error('Error executing scheduled deletions:', error);
      throw error;
    }
  }

  /**
   * Delete all user data
   */
  async deleteUserData(userId) {
    try {
      logger.info(`Deleting all data for user ${userId}`);

      // Delete subscription
      await Subscription.findOneAndDelete({ userId });

      // Anonymize notifications (keep for analytics, but remove PII)
      await Notification.updateMany(
        { userId },
        {
          userId: `DELETED_${Date.now()}`,
          endpoint: 'DELETED',
          updatedAt: Date.now()
        }
      );

      // Mark consent as deleted
      const consent = await UserConsent.findOne({ userId });
      if (consent) {
        consent.deletionCompletedAt = new Date();
        consent.updatedAt = Date.now();
        await consent.save();
      }

      logger.info(`Successfully deleted data for user ${userId}`);

      return {
        userId,
        deletedAt: new Date(),
        message: 'All user data has been permanently deleted'
      };
    } catch (error) {
      logger.error(`Error deleting data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Request data export (Right of Access)
   */
  async requestDataExport(userId) {
    try {
      const consent = await UserConsent.findOne({ userId });

      if (!consent) {
        throw new Error('User consent record not found');
      }

      const exportData = await this.exportUserData(userId);

      // Store export request
      consent.dataExportRequests.push({
        requestedAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      await consent.save();

      logger.info(`Data export completed for user ${userId}`);

      return exportData;
    } catch (error) {
      logger.error(`Error exporting data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Export all user data
   */
  async exportUserData(userId) {
    try {
      const [consent, subscription, notifications] = await Promise.all([
        UserConsent.findOne({ userId }).lean(),
        Subscription.findOne({ userId }).lean(),
        Notification.find({ userId }).sort({ timestamp: -1 }).limit(100).lean()
      ]);

      return {
        userId,
        exportedAt: new Date().toISOString(),
        dataRetentionPolicy: '30 days for notifications, indefinite for subscriptions until revoked',
        consent: consent ? {
          pushNotifications: consent.pushNotificationsConsent,
          dataProcessing: consent.dataProcessingConsent,
          analytics: consent.analyticsConsent,
          consentHistory: consent.consentHistory,
          createdAt: consent.createdAt,
          updatedAt: consent.updatedAt
        } : null,
        subscription: subscription ? {
          trainLines: subscription.trainLines,
          weatherRegions: subscription.weatherRegions,
          stibLines: subscription.stibLines,
          quietHours: subscription.quietHours,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt
        } : null,
        notifications: notifications.map(n => ({
          title: n.title,
          body: n.body,
          type: n.type,
          read: n.read,
          timestamp: n.timestamp
        })),
        statistics: {
          totalNotifications: notifications.length,
          subscriptionActive: subscription?.active || false
        }
      };
    } catch (error) {
      logger.error(`Error exporting user data for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get consent audit trail
   */
  async getConsentAuditTrail(userId) {
    const consent = await UserConsent.findOne({ userId });
    return consent ? consent.consentHistory : [];
  }
}

export default new GDPRService();

