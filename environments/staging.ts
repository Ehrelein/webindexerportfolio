export const staging = {
  env: "staging",
  port: 3000,
  host: "0.0.0.0",
  db: {
    path: "./crawler.db",
    wal: true,
    busyTimeout: 10000,
  },
  crawler: {
    concurrency: 10,
    domainLimit: 10,
    domainMax: 100,
    maxDepth: 8,
    fetchTimeout: 4000,
    queueLowWater: 5000,
    seedBatch: 250,
    minDiskMb: 300,
    diskMaxUsagePct: 85,
  },
  redis: {
    host: "redis-staging",
    port: 6379,
    db: 0,
  },
  kafka: {
    clientId: "webindexer-staging",
    brokers: ["kafka-staging:9092"],
    topic: "urls-staging",
  },
  elasticsearch: {
    node: "http://elasticsearch-staging:9200",
    index: "pages-staging",
  },
  logging: {
    level: "info",
    pretty: true,
  },
  rateLimit: {
    windowMs: 60000,
    max: 500,
    searchMax: 50,
  },
};
