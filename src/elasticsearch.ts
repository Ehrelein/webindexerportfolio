import { Client } from "@elastic/elasticsearch";
import { ES_NODE, ES_INDEX } from "./config";
import { PageData } from "./types";

let client: Client | null = null;
let connected: boolean = false;

interface SearchResult {
  url: string;
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  domain: string;
  rank: number;
  popularity: number;
}

function getEsClient(): Client | null {
  if (client) return client;
  try {
    client = new Client({ node: ES_NODE, requestTimeout: 10000 });
    return client;
  } catch (e) {
    return null;
  }
}

export async function connectElasticsearch(): Promise<boolean> {
  const c = getEsClient();
  if (!c) return false;
  try {
    await c.ping();
    connected = true;
    console.log("[es] connected to " + ES_NODE);
    return true;
  } catch (e: any) {
    console.log("[es] connection failed:", e.message);
    connected = false;
    return false;
  }
}

export async function initEsIndex(): Promise<boolean> {
  const c = getEsClient();
  if (!c || !connected) return false;
  try {
    const exists = await c.indices.exists({ index: ES_INDEX });
    if (!exists) {
      await c.indices.create({
        index: ES_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                default: { type: "standard" },
              },
            },
          },
          mappings: {
            properties: {
              url: { type: "keyword" },
              title: { type: "text", analyzer: "standard" },
              metaDescription: { type: "text", analyzer: "standard" },
              ogTitle: { type: "text", analyzer: "standard" },
              ogDescription: { type: "text", analyzer: "standard" },
              domain: { type: "keyword" },
              content: { type: "text", analyzer: "standard" },
              lang: { type: "keyword" },
              https: { type: "boolean" },
              popularity: { type: "integer" },
              depth: { type: "integer" },
              timestamp: { type: "date" },
            },
          },
        },
      });
      console.log("[es] index created: " + ES_INDEX);
    }
    return true;
  } catch (e: any) {
    console.log("[es] index init error:", e.message);
    return false;
  }
}

export async function indexPage(doc: PageData): Promise<boolean> {
  const c = getEsClient();
  if (!c || !connected) return false;
  try {
    await c.index({
      index: ES_INDEX,
      id: Buffer.from(doc.url).toString("base64").slice(0, 512),
      document: {
        url: doc.url,
        title: doc.title || "",
        metaDescription: doc.desc || doc.meta || "",
        ogTitle: doc.ogt || "",
        ogDescription: doc.ogd || "",
        domain: doc.dom || "",
        content: (doc as any).content || "",
        lang: doc.lang || "",
        https: doc.https === 1,
        popularity: doc.pop || 0,
        depth: doc.depth || 0,
        timestamp: doc.ts || Date.now(),
      },
    });
    return true;
  } catch (e) {
    return false;
  }
}

export async function bulkIndexPages(docs: PageData[]): Promise<boolean> {
  const c = getEsClient();
  if (!c || !connected || !docs.length) return false;
  try {
    const body = docs.flatMap(doc => [
      { index: { _index: ES_INDEX, _id: Buffer.from(doc.url).toString("base64").slice(0, 512) } },
      {
        url: doc.url,
        title: doc.title || "",
        metaDescription: doc.desc || doc.meta || "",
        ogTitle: doc.ogt || "",
        ogDescription: doc.ogd || "",
        domain: doc.dom || "",
        content: (doc as any).content || "",
        lang: doc.lang || "",
        https: doc.https === 1,
        popularity: doc.pop || 0,
        depth: doc.depth || 0,
        timestamp: doc.ts || Date.now(),
      },
    ]);
    const result = await c.bulk({ body, refresh: false });
    return !result.errors;
  } catch (e) {
    return false;
  }
}

export async function searchPages(query: string, limit: number = 30): Promise<SearchResult[] | null> {
  const c = getEsClient();
  if (!c || !connected) return null;
  try {
    const result = await c.search({
      index: ES_INDEX,
      body: {
        size: limit,
        query: {
          multi_match: {
            query,
            fields: ["title^3", "metaDescription^2", "ogTitle^2", "ogDescription", "content"],
            type: "best_fields",
            fuzziness: "AUTO",
          },
        },
        highlight: {
          fields: {
            title: { number_of_fragments: 1 },
            metaDescription: { number_of_fragments: 1 },
          },
        },
        _source: ["url", "title", "metaDescription", "ogTitle", "ogDescription", "domain", "popularity"],
      },
    });
    return result.hits.hits.map((hit: any) => ({
      url: hit._source.url,
      title: hit._source.title,
      metaDescription: hit._source.metaDescription,
      ogTitle: hit._source.ogTitle,
      ogDescription: hit._source.ogDescription,
      domain: hit._source.domain,
      rank: hit._score,
      popularity: hit._source.popularity,
    }));
  } catch (e: any) {
    console.log("[es] search error:", e.message);
    return null;
  }
}

export async function getStats(): Promise<{ docCount: number; sizeMB: string; connected: boolean } | null> {
  const c = getEsClient();
  if (!c || !connected) return null;
  try {
    const stats = await c.indices.stats({ index: ES_INDEX });
    const docCount: number = stats.indices![ES_INDEX]?.total?.docs?.count || 0;
    const sizeBytes: number = stats.indices![ES_INDEX]?.total?.store?.size_in_bytes || 0;
    return { docCount, sizeMB: (sizeBytes / 1048576).toFixed(1), connected };
  } catch (e) {
    return { docCount: 0, sizeMB: "0", connected: false };
  }
}

export async function closeEs(): Promise<void> {
  if (client) {
    try { await client.close(); } catch {}
    client = null;
    connected = false;
  }
}

export function isConnected(): boolean {
  return connected;
}
