export default () => ({
  port: parseInt(process.env.PORT, 10) || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 2,
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'product-service',
    groupId: process.env.KAFKA_GROUP_ID || 'product-service-group',
  },

  grpc: {
    port: parseInt(process.env.GRPC_PORT, 10) || 50052,
    host: process.env.GRPC_HOST || 'localhost',
  },
});
