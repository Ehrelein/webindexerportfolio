import { getRandomSeeds } from '../src/seeds';

describe('seeds', () => {
  describe('getRandomSeeds', () => {
    test('returns requested number of seeds', () => {
      const seeds: string[] = getRandomSeeds(10);
      expect(seeds.length).toBeGreaterThanOrEqual(10);
    });

    test('seeds are valid URLs', () => {
      const seeds: string[] = getRandomSeeds(20);
      seeds.forEach((url: string) => {
        expect(url).toMatch(/^https?:\/\//);
      });
    });

    test('includes Wikipedia URLs', () => {
      const seeds: string[] = getRandomSeeds(50);
      const wikiSeeds = seeds.filter((s: string) => s.includes('wikipedia.org'));
      expect(wikiSeeds.length).toBeGreaterThan(0);
    });

    test('returns different results on multiple calls', () => {
      const seeds1: string[] = getRandomSeeds(30);
      const seeds2: string[] = getRandomSeeds(30);
      const allSame = seeds1.every((s: string, i: number) => s === seeds2[i]);
      expect(allSame).toBe(false);
    });
  });
});
