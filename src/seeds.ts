import { SEEDS, WIKI_LANGS, WIKI_TOPICS, SEED_BATCH } from "./config";
import type { Statements } from "./types";

export function getRandomSeeds(count: number): string[] {
  const seeds: string[] = [];
  const shuffledExtra = [...SEEDS].sort(() => Math.random() - 0.5);
  const extraCount = Math.min(count, shuffledExtra.length);
  for (let i = 0; i < extraCount; i++) seeds.push(shuffledExtra[i]);
  const shuffledWiki = [...WIKI_TOPICS].sort(() => Math.random() - 0.5);
  const wikiCount = Math.min(count, shuffledWiki.length);
  for (let i = 0; i < wikiCount; i++) seeds.push("https://en.wikipedia.org/wiki/" + shuffledWiki[i]);
  for (let i = 0; i < Math.min(count, 80); i++) {
    const lang = WIKI_LANGS[Math.floor(Math.random() * WIKI_LANGS.length)];
    const topic = WIKI_TOPICS[Math.floor(Math.random() * WIKI_TOPICS.length)];
    seeds.push("https://" + lang + ".wikipedia.org/wiki/" + topic);
  }
  for (let i = 0; i < Math.min(count, 30); i++) {
    const page = Math.floor(Math.random() * 5000) + 1;
    seeds.push("https://en.wikipedia.org/w/index.php?special=recentchanges&limit=50&offset=" + (page * 50));
  }
  return seeds;
}

export async function addSeedBatch(db: any, stmts: Statements, isAsync: boolean): Promise<void> {
  const seeds = getRandomSeeds(SEED_BATCH);
  let added = 0;
  for (const url of seeds) {
    const v = await stmts.isVisited.get(url);
    if (!v) {
      try { await stmts.insertFrontier.run(url, 0, null); added++; } catch(e) {}
    }
  }
  if (added > 0) {
    const fc = await stmts.frontierCount.get();
    console.log("[seeder] injected " + added + " new seeds, frontier=" + (fc ? fc.c : 0));
  }
}

export async function seedInitialUrls(db: any, stmts: Statements, urls: string[], isAsync: boolean): Promise<void> {
  for (const url of urls) {
    try { await stmts.insertFrontier.run(url, 0, null); } catch(e) {}
  }
}
