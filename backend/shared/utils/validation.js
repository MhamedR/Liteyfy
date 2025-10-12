import Joi from 'joi';

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  /**
   * Push subscription validation schema
   */
  pushSubscription: Joi.object({
    endpoint: Joi.string().uri().required(),
    keys: Joi.object({
      p256dh: Joi.string().required(),
      auth: Joi.string().required()
    }).required()
  }),

  /**
   * Train line subscription schema
   */
  trainLineSubscription: Joi.object({
    lineId: Joi.string().required(),
    lineName: Joi.string().required(),
    enabled: Joi.boolean().default(true),
    notifyDelays: Joi.boolean().default(true),
    notifyCancellations: Joi.boolean().default(true),
    minDelayMinutes: Joi.number().min(0).default(5)
  }),

  /**
   * Weather region subscription schema
   */
  weatherRegionSubscription: Joi.object({
    regionId: Joi.string().required(),
    regionName: Joi.string().required(),
    enabled: Joi.boolean().default(true),
    alertTypes: Joi.array().items(Joi.string().valid(
      'THUNDERSTORM', 'HEAVY_RAIN', 'SNOW', 'ICE',
      'WIND', 'FOG', 'HEAT', 'COLD'
    )).min(1)
  }),

  /**
   * STIB line subscription schema
   */
  stibLineSubscription: Joi.object({
    lineId: Joi.string().required(),
    lineName: Joi.string().required(),
    lineType: Joi.string().valid('METRO', 'TRAM', 'BUS').required(),
    enabled: Joi.boolean().default(true),
    notifyDisruptions: Joi.boolean().default(true)
  }),

  /**
   * Notification event schema
   */
  notificationEvent: Joi.object({
    type: Joi.string().valid(
      'TRAIN_DELAY',
      'TRAIN_CANCELLATION',
      'WEATHER_ALERT',
      'STIB_DISRUPTION',
      'PLATFORM_CHANGE'
    ).required(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
    title: Joi.string().max(100).required(),
    message: Joi.string().max(500).required(),
    data: Joi.object().default({})
  }),

  /**
   * Pagination schema
   */
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Validate data against a schema
 * @param {any} data - Data to validate
 * @param {Joi.Schema} schema - Validation schema
 * @returns {Promise<any>} Validated data
 * @throws {Error} Validation error
 */
export async function validate(data, schema) {
  try {
    const validated = await schema.validateAsync(data, {
      abortEarly: false,
      stripUnknown: true
    });
    return validated;
  } catch (error) {
    const details = error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message
    }));

    const validationError = new Error('Validation failed');
    validationError.statusCode = 400;
    validationError.details = details;

    throw validationError;
  }
}

// Export Joi for use in other modules
export { Joi };

export default { ValidationSchemas, validate, Joi };

