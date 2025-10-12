import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format
 */
const logFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service}] ${level}: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

/**
 * Create a logger instance for a service
 * @param {string} service - Service name
 * @returns {winston.Logger} Logger instance
 */
export function createLogger(service = 'default') {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    defaultMeta: { service },
    transports: [
      new winston.transports.Console({
        format: combine(
          colorize(),
          logFormat
        )
      })
    ]
  });

  // Add file transports in production
  if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({
      filename: `logs/${service}-error.log`,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }));

    logger.add(new winston.transports.File({
      filename: `logs/${service}-combined.log`,
      maxsize: 5242880,
      maxFiles: 5
    }));
  }

  return logger;
}

export default { createLogger };

