export const production = {
  env: "production",
  port: process.env.PORT || 3000,
  host: "0.0.0.0",
  db: {
    path: process.env.DB_PATH || "./crawler.db",
    wal: true,
    busyTimeout: 15000,
  },
  crawler: {
    concurrency: parseInt(process.env.CONCURRENCY || "") || 15,
    domainLimit: parseInt(process.env.DOMAIN_LIMIT || "") || 15,
    domainMax: parseInt(process.env.DOMAIN_MAX || "") || 200,
    maxDepth: parseInt(process.env.MAX_DEPTH || "") || 10,
    fetchTimeout: parseInt(process.env.FETCH_TIMEOUT || "") || 3500,
    queueLowWater: parseInt(process.env.QUEUE_LOW_WATER || "") || 10000,
    seedBatch: parseInt(process.env.SEED_BATCH || "") || 500,
    minDiskMb: parseInt(process.env.MIN_DISK_MB || "") || 500,
    diskMaxUsagePct: parseInt(process.env.DISK_MAX_USAGE_PCT || "") || 80,
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "") || 6379,
    db: parseInt(process.env.REDIS_DB || "") || 0,
    password: process.env.REDIS_PASSWORD,
  },
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || "webindexer-prod",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    topic: process.env.KAFKA_TOPIC || "urls",
  },
  elasticsearch: {
    node: process.env.ES_NODE || "http://localhost:9200",
    index: process.env.ES_INDEX || "pages",
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
    pretty: false,
  },
  rateLimit: {
    windowMs: 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX || "") || 100,
    searchMax: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || "") || 30,
  },
};
