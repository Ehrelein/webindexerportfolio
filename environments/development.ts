export const development = {
  env: "development",
  port: 3000,
  host: "localhost",
  db: {
    path: "./crawler.db",
    wal: true,
    busyTimeout: 5000,
  },
  crawler: {
    concurrency: 5,
    domainLimit: 5,
    domainMax: 50,
    maxDepth: 5,
    fetchTimeout: 5000,
    queueLowWater: 1000,
    seedBatch: 100,
    minDiskMb: 200,
    diskMaxUsagePct: 90,
  },
  redis: {
    host: "localhost",
    port: 6379,
    db: 0,
  },
  kafka: {
    clientId: "webindexer-dev",
    brokers: ["localhost:9092"],
    topic: "urls-dev",
  },
  elasticsearch: {
    node: "http://localhost:9200",
    index: "pages-dev",
  },
  logging: {
    level: "debug",
    pretty: true,
  },
  rateLimit: {
    windowMs: 60000,
    max: 1000,
    searchMax: 100,
  },
};
