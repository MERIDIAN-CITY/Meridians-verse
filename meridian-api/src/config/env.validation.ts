import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().integer().min(1).max(65535).default(3000),

  ALLOWED_ORIGINS: Joi.string().optional().allow(''),

  // Railway-style single connection URL (optional; takes precedence over individual vars)
  DATABASE_URL: Joi.string().uri().optional(),

  // Individual Postgres vars (required when DATABASE_URL is absent)
  POSTGRES_HOST: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_PORT: Joi.number().integer().min(1).max(65535).default(5432),
  POSTGRES_USER: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_PASSWORD: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_DB: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_SYNC: Joi.string().valid('true', 'false').default('false'),
  POSTGRES_LOAD: Joi.string().valid('true', 'false').default('true'),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_TOKEN_AUDIENCE: Joi.string().required(),
  JWT_TOKEN_ISSUER: Joi.string().required(),
  JWT_ACCESS_TOKEN_TTL: Joi.number().integer().positive().default(360),
  JWT_REFRESH_TOKEN_TTL: Joi.number().integer().positive().default(7776000),

  // Email verification
  VERIFICATION_TOKEN_TTL_HOURS: Joi.number().integer().positive().default(24),

  // Application
  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  // File upload
  STORAGE_PROVIDER: Joi.string().valid('local', 's3').default('local'),
  UPLOAD_MAX_SIZE_MB: Joi.number().positive().default(5),
  UPLOAD_S3_BUCKET: Joi.string().optional().allow(''),
  UPLOAD_S3_REGION: Joi.string().optional().allow(''),
  UPLOAD_S3_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  UPLOAD_S3_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
});
