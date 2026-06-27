import * as config from '../src/config';

describe('config', () => {
  test('exports all required constants', () => {
    expect(config.MAX_NODES).toBeGreaterThan(0);
    expect(config.CONCURRENCY).toBeGreaterThan(0);
    expect(config.DOMAIN_LIMIT).toBeGreaterThan(0);
    expect(config.DOMAIN_MAX).toBeGreaterThan(0);
    expect(config.FETCH_TIMEOUT).toBeGreaterThan(0);
    expect(config.MIN_DISK_MB).toBeGreaterThan(0);
    expect(config.DISK_MAX_USAGE_PCT).toBe(80);
    expect(config.MAX_DEPTH).toBe(10);
  });

  test('SEEDS is a non-empty array', () => {
    expect(Array.isArray(config.SEEDS)).toBe(true);
    expect(config.SEEDS.length).toBeGreaterThan(50);
  });

  test('all seeds are valid URLs', () => {
    config.SEEDS.forEach((url: string) => {
      expect(() => new URL(url)).not.toThrow();
    });
  });

  test('BLACKLIST is a Set', () => {
    expect(config.BLACKLIST).toBeInstanceOf(Set);
    expect(config.BLACKLIST.size).toBeGreaterThan(10);
  });

  test('BLACKLIST contains common ad/tracking domains', () => {
    expect(config.BLACKLIST.has('facebook.com')).toBe(true);
    expect(config.BLACKLIST.has('doubleclick.net')).toBe(true);
    expect(config.BLACKLIST.has('google-analytics.com')).toBe(true);
  });

  test('WIKI_LANGS has 28 languages', () => {
    expect(config.WIKI_LANGS.length).toBe(28);
    expect(config.WIKI_LANGS).toContain('en');
    expect(config.WIKI_LANGS).toContain('ru');
  });

  test('WIKI_TOPICS has 80+ topics', () => {
    expect(config.WIKI_TOPICS.length).toBeGreaterThanOrEqual(80);
  });
});
