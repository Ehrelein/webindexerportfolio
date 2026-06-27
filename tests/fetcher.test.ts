import { getDomain, isBlacklisted, parsePage, checkRobotsTxt, robotsCache } from '../src/fetcher';

interface ParsePageResult {
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  lang: string;
  links: string[];
  contentLength: number;
}

describe('fetcher', () => {
  describe('getDomain', () => {
    test('extracts domain from URL', () => {
      expect(getDomain('https://www.example.com/page')).toBe('example.com');
    });

    test('strips www prefix', () => {
      expect(getDomain('https://www.wikipedia.org/wiki/Test')).toBe('wikipedia.org');
    });

    test('returns empty string for invalid URL', () => {
      expect(getDomain('not-a-url')).toBe('');
    });

    test('handles subdomains', () => {
      expect(getDomain('https://en.wikipedia.org/wiki/Test')).toBe('en.wikipedia.org');
    });
  });

  describe('isBlacklisted', () => {
    test('blocks blacklisted domains', () => {
      expect(isBlacklisted('https://facebook.com/page')).toBe(true);
      expect(isBlacklisted('https://www.instagram.com/p/123')).toBe(true);
      expect(isBlacklisted('https://twitter.com/user')).toBe(true);
    });

    test('blocks ad networks', () => {
      expect(isBlacklisted('https://doubleclick.net/ad')).toBe(true);
      expect(isBlacklisted('https://google-analytics.com/collect')).toBe(true);
    });

    test('allows normal domains', () => {
      expect(isBlacklisted('https://example.com/page')).toBe(false);
      expect(isBlacklisted('https://github.com/repo')).toBe(false);
    });

    test('blocks invalid URLs', () => {
      expect(isBlacklisted('not-a-url')).toBe(true);
    });
  });

  describe('parsePage', () => {
    test('extracts title', () => {
      const html = '<html><head><title>Test Page</title></head><body></body></html>';
      const result: ParsePageResult = parsePage(html, 'https://example.com');
      expect(result.title).toBe('Test Page');
    });

    test('extracts meta description', () => {
      const html = '<html><head><meta name="description" content="A test page"></head></html>';
      const result: ParsePageResult = parsePage(html, 'https://example.com');
      expect(result.metaDescription).toBe('A test page');
    });

    test('extracts og:title', () => {
      const html = '<html><head><meta property="og:title" content="OG Title"></head></html>';
      const result: ParsePageResult = parsePage(html, 'https://example.com');
      expect(result.ogTitle).toBe('OG Title');
    });

    test('extracts language', () => {
      const html = '<html lang="ru"><head></head><body></body></html>';
      const result: ParsePageResult = parsePage(html, 'https://example.com');
      expect(result.lang).toBe('ru');
    });

    test('extracts links', () => {
      const html = '<html><body><a href="/page1">Link1</a><a href="https://other.com/page2">Link2</a></body></html>';
      const result: ParsePageResult = parsePage(html, 'https://example.com');
      expect(result.links.length).toBe(2);
      expect(result.links).toContain('https://example.com/page1');
      expect(result.links).toContain('https://other.com/page2');
    });

    test('returns empty title for missing title', () => {
      const html = '<html><head></head><body></body></html>';
      const result: ParsePageResult = parsePage(html, 'https://example.com');
      expect(result.title).toBe('');
    });

    test('tracks content length', () => {
      const html = '<html><head><title>Hi</title></head><body>Hello World</body></html>';
      const result: ParsePageResult = parsePage(html, 'https://example.com');
      expect(result.contentLength).toBe(html.length);
    });
  });

  describe('checkRobotsTxt', () => {
    beforeEach(() => {
      robotsCache.clear();
    });

    test('returns true when robots.txt fetch fails (allow by default)', async () => {
      const result = await checkRobotsTxt('https://nonexistent-domain-12345.com/page');
      expect(result).toBe(true);
    });
  });
});
