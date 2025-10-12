import express from 'express';
import { createLogger, Joi, validate } from '../../../../shared/index.js';
import gdprService from '../../../../shared/services/gdprService.js';
import { extractClientMetadata, auditConsentAction } from '../../../../shared/middleware/consentCheck.js';

const router = express.Router();
const logger = createLogger('gdpr-routes');

// Validation schemas
const grantConsentSchema = Joi.object({
  userId: Joi.string().required(),
  consentType: Joi.string().valid('PUSH_NOTIFICATIONS', 'DATA_PROCESSING', 'ANALYTICS').required(),
  privacyPolicyVersion: Joi.string().optional()
});

const revokeConsentSchema = Joi.object({
  userId: Joi.string().required(),
  consentType: Joi.string().valid('PUSH_NOTIFICATIONS', 'DATA_PROCESSING', 'ANALYTICS').required()
});

const userIdSchema = Joi.object({
  userId: Joi.string().required()
});

/**
 * POST /api/gdpr/consent/grant
 * Grant user consent
 */
router.post('/consent/grant',
  extractClientMetadata,
  auditConsentAction('GRANT_CONSENT'),
  async (req, res, next) => {
    try {
      const data = await validate(req.body, grantConsentSchema);
      const metadata = {
        ...req.clientMetadata,
        privacyPolicyVersion: data.privacyPolicyVersion || '1.0'
      };

      const consent = await gdprService.grantConsent(data.userId, data.consentType, metadata);

      res.status(200).json({
        message: 'Consent granted successfully',
        consent: {
          userId: consent.userId,
          pushNotifications: consent.pushNotificationsConsent?.granted || false,
          dataProcessing: consent.dataProcessingConsent?.granted || false,
          analytics: consent.analyticsConsent?.granted || false
        }
      });
    } catch (error) {
      logger.error('Error granting consent:', error);
      next(error);
    }
  }
);

/**
 * POST /api/gdpr/consent/revoke
 * Revoke user consent
 */
router.post('/consent/revoke',
  extractClientMetadata,
  auditConsentAction('REVOKE_CONSENT'),
  async (req, res, next) => {
    try {
      const data = await validate(req.body, revokeConsentSchema);
      const consent = await gdprService.revokeConsent(data.userId, data.consentType, req.clientMetadata);

      res.status(200).json({
        message: 'Consent revoked successfully',
        consent: {
          userId: consent.userId,
          pushNotifications: consent.pushNotificationsConsent?.granted || false,
          dataProcessing: consent.dataProcessingConsent?.granted || false,
          analytics: consent.analyticsConsent?.granted || false
        }
      });
    } catch (error) {
      logger.error('Error revoking consent:', error);
      next(error);
    }
  }
);

/**
 * GET /api/gdpr/consent/status/:userId
 * Get consent status
 */
router.get('/consent/status/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const status = await gdprService.getConsentStatus(userId);

    res.status(200).json(status);
  } catch (error) {
    logger.error('Error getting consent status:', error);
    next(error);
  }
});

/**
 * POST /api/gdpr/delete
 * Request data deletion (Right to be Forgotten)
 */
router.post('/delete',
  extractClientMetadata,
  auditConsentAction('REQUEST_DATA_DELETION'),
  async (req, res, next) => {
    try {
      const data = await validate(req.body, userIdSchema);
      const result = await gdprService.requestDataDeletion(data.userId, req.clientMetadata);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error requesting data deletion:', error);
      next(error);
    }
  }
);

/**
 * POST /api/gdpr/delete/cancel
 * Cancel data deletion request
 */
router.post('/delete/cancel',
  extractClientMetadata,
  auditConsentAction('CANCEL_DATA_DELETION'),
  async (req, res, next) => {
    try {
      const data = await validate(req.body, userIdSchema);
      const result = await gdprService.cancelDataDeletion(data.userId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error canceling data deletion:', error);
      next(error);
    }
  }
);

/**
 * GET /api/gdpr/export/:userId
 * Request data export (Right of Access)
 */
router.get('/export/:userId',
  auditConsentAction('EXPORT_USER_DATA'),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const exportData = await gdprService.requestDataExport(userId);

      res.status(200).json({
        message: 'Data export completed',
        data: exportData
      });
    } catch (error) {
      logger.error('Error exporting user data:', error);
      next(error);
    }
  }
);

/**
 * GET /api/gdpr/audit/:userId
 * Get consent audit trail
 */
router.get('/audit/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const auditTrail = await gdprService.getConsentAuditTrail(userId);

    res.status(200).json({
      userId,
      auditTrail
    });
  } catch (error) {
    logger.error('Error getting audit trail:', error);
    next(error);
  }
});

export default router;

