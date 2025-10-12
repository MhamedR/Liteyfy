import { createLogger } from '../utils/logger.js';
import gdprService from '../services/gdprService.js';

const logger = createLogger('consent-middleware');

/**
 * Middleware to check if user has valid consent before processing
 */
export const requireConsent = (consentType = 'PUSH_NOTIFICATIONS') => {
  return async (req, res, next) => {
    try {
      const userId = req.body.userId || req.params.userId || req.query.userId;

      if (!userId) {
        return res.status(400).json({
          error: 'UserId is required',
          code: 'MISSING_USER_ID'
        });
      }

      const hasConsent = await gdprService.hasValidConsent(userId);

      if (!hasConsent) {
        logger.warn(`User ${userId} attempted action without valid consent`);
        return res.status(403).json({
          error: 'User consent required',
          code: 'CONSENT_REQUIRED',
          message: 'You must grant consent for data processing to use this feature'
        });
      }

      // Attach consent info to request
      req.userConsent = await gdprService.getConsentStatus(userId);

      next();
    } catch (error) {
      logger.error('Error checking consent:', error);
      return res.status(500).json({
        error: 'Error verifying consent',
        code: 'CONSENT_CHECK_FAILED'
      });
    }
  };
};

/**
 * Middleware to log consent-related actions for audit trail
 */
export const auditConsentAction = (action) => {
  return (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
      // Log audit trail
      const auditLog = {
        timestamp: new Date(),
        action,
        userId: req.body.userId || req.params.userId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        requestBody: req.body ? JSON.stringify(req.body) : null
      };

      logger.info('Consent action audit', auditLog);

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to extract client metadata for consent tracking
 */
export const extractClientMetadata = (req, res, next) => {
  req.clientMetadata = {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date()
  };

  next();
};

