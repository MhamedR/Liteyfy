import { Subscription, Notification, createLogger } from '../../../../shared/index.js';

const logger = createLogger('notification-service');

export class NotificationService {
  constructor(webpush) {
    this.webpush = webpush;
  }

  async sendNotification(subscription, payload) {
    try {
      const notificationData = {
        subscriptionId: subscription._id,
        endpoint: subscription.endpoint,
        ...payload,
        status: 'PENDING'
      };

      // Save notification to database
      const notification = new Notification(notificationData);
      await notification.save();

      // Check quiet hours
      if (!subscription.isNotificationAllowed(payload.priority)) {
        logger.info('Notification blocked by quiet hours', { endpoint: subscription.endpoint });
        await notification.markFailed(new Error('Quiet hours active'));
        return null;
      }

      // Send push notification
      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.message,
        data: payload.data,
        tag: payload.type,
        requireInteraction: payload.priority === 'CRITICAL'
      });

      const result = await this.webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        pushPayload,
        { TTL: 3600 }
      );

      await notification.markSent(result);
      logger.info('Notification sent successfully', { endpoint: subscription.endpoint });

      return notification;
    } catch (error) {
      logger.error('Failed to send notification:', error);

      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription expired or invalid
        await Subscription.deleteOne({ endpoint: subscription.endpoint });
        logger.info('Removed expired subscription', { endpoint: subscription.endpoint });
      } else if (notification) {
        await notification.incrementRetry();
      }

      throw error;
    }
  }

  async sendBulkNotifications(subscriptions, payload) {
    const results = {
      success: 0,
      failed: 0,
      total: subscriptions.length
    };

    for (const subscription of subscriptions) {
      try {
        await this.sendNotification(subscription, payload);
        results.success++;
      } catch (error) {
        results.failed++;
        logger.error('Bulk notification failed for subscription:', error);
      }
    }

    logger.info('Bulk notifications completed', results);
    return results;
  }
}

