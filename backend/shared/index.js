// Configuration exports
export { DatabaseConnection, default as database } from './config/database.js';
export { RedisConnection, default as redis } from './config/redis.js';
export { KafkaConnection } from './config/kafka.js';

// Utility exports
export { createLogger } from './utils/logger.js';
export { ValidationSchemas, validate, Joi } from './utils/validation.js';

// Model exports
export { default as Subscription } from './models/Subscription.js';
export { default as Notification } from './models/Notification.js';
export { default as Event } from './models/Event.js';
export { default as UserConsent } from './models/UserConsent.js';

// Service exports
export { KafkaProducerService } from './services/kafkaProducerService.js';
export { EventFilteringService } from './services/eventFilteringService.js';
export { KafkaMonitoringService } from './services/kafkaMonitoringService.js';
export { default as gdprService } from './services/gdprService.js';

// Middleware exports
export { requireConsent, auditConsentAction, extractClientMetadata } from './middleware/consentCheck.js';

