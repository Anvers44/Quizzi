export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigin: process.env.CORS_ORIGIN || 'http://192.168.200.134:5173',
};