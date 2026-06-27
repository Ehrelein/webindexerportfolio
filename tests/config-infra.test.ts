import * as config from '../src/config';

describe('config - new infrastructure flags', () => {
  test('DB_BACKEND defaults to sqlite', () => {
    expect(config.DB_BACKEND).toBe("sqlite");
  });

  test('REDIS_ENABLED defaults to false', () => {
    expect(config.REDIS_ENABLED).toBe(false);
  });

  test('KAFKA_ENABLED defaults to false', () => {
    expect(config.KAFKA_ENABLED).toBe(false);
  });

  test('ES_ENABLED defaults to false', () => {
    expect(config.ES_ENABLED).toBe(false);
  });

  test('PG config has defaults', () => {
    expect(config.PG_HOST).toBe("localhost");
    expect(config.PG_PORT).toBe(5432);
    expect(config.PG_DATABASE).toBe("webindexer");
    expect(config.PG_USER).toBe("webindexer");
  });

  test('REDIS config has defaults', () => {
    expect(config.REDIS_HOST).toBe("localhost");
    expect(config.REDIS_PORT).toBe(6379);
  });

  test('KAFKA_BROKERS is an array', () => {
    expect(Array.isArray(config.KAFKA_BROKERS)).toBe(true);
    expect(config.KAFKA_BROKERS).toContain("localhost:9092");
  });

  test('ES config has defaults', () => {
    expect(config.ES_NODE).toBe("http://localhost:9200");
    expect(config.ES_INDEX).toBe("pages");
  });
});
