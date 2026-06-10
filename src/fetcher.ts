import https from "https";
import http from "http";
import dns from "dns";
import { FETCH_TIMEOUT, DNS_TIMEOUT, BLACKLIST } from "./config";
import { getBreaker } from "./circuit";
import logger from "./logger";
import type { FetchResult, ParsedPage } from "./types";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const dnsCache: Map<string, string> = new Map();
const robotsCache: Map<string, string[] | null> = new Map();
const ROBOTS_CACHE_MAX = 10000;
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 200, timeout: 3000 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 200, timeout: 3000 });

export function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return ""; }
}

export function isBlacklisted(url: string): boolean {
  try {
    const h = new URL(url).hostname.replace("www.", "");
    for (const d of BLACKLIST) { if (h === d || h.endsWith("." + d)) return true; }
    return false;
  } catch { return true; }
}

export function resolveDns(host: string): Promise<string> {
  if (dnsCache.has(host)) return Promise.resolve(dnsCache.get(host)!);
  return new Promise((ok, no) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => no("dns" as any), DNS_TIMEOUT);
    dns.resolve4(host, (err: any, addrs: string[] | undefined) => {
      clearTimeout(timer);
      if (err || !addrs || !addrs.length) {
        dns.lookup(host, (err2: any, addr: string | undefined) => {
          if (err2) no(err2);
          else { dnsCache.set(host, addr!); ok(addr!); }
        });
      } else { dnsCache.set(host, addrs[0]); ok(addrs[0]); }
    });
  });
}

export function evictDnsCache(maxSize: number): number {
  if (dnsCache.size <= maxSize) return 0;
  const del = Math.floor(dnsCache.size / 2);
  let n = 0;
  for (const k of dnsCache.keys()) {
    if (n >= del) break;
    dnsCache.delete(k);
    n++;
  }
  return n;
}

const httpBreaker = getBreaker("http-fetch", { failureThreshold: 50, resetTimeout: 8000 });

function fetchHtmlRaw(url: string, depth: number = 0): Promise<FetchResult> {
  if (depth > 5) return Promise.reject(new Error("redirects"));
  return new Promise((ok, no) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => no(new Error("timeout")), FETCH_TIMEOUT);
    const mod = url.startsWith("https") ? https : http;
    const ag = url.startsWith("https") ? httpsAgent : httpAgent;
    const req = mod.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9", "Accept-Encoding": "identity" },
      agent: ag, timeout: FETCH_TIMEOUT,
    }, (res: http.IncomingMessage) => {
      if (res.statusCode! >= 300 && res.statusCode! < 400 && res.headers.location) {
        clearTimeout(timer); res.resume();
        const loc = res.headers.location;
        fetchHtmlRaw(loc.startsWith("http") ? loc : new URL(loc, url).toString(), depth + 1).then(ok).catch(no);
        return;
      }
      if (res.statusCode! >= 500) { clearTimeout(timer); res.resume(); no(new Error("HTTP " + res.statusCode)); return; }
      const ct = (res.headers["content-type"] || "").toLowerCase();
      if (!ct.includes("text/html") && !ct.includes("xhtml")) { clearTimeout(timer); res.resume(); no(new Error("not HTML")); return; }
      let detectedEncoding = "utf-8";
      const charsetMatch = ct.match(/charset=([^\s;]+)/);
      if (charsetMatch) detectedEncoding = charsetMatch[1].replace(/["']/g, "");
      const chunks: Buffer[] = []; let sz = 0;
      res.on("data", (c: Buffer) => { sz += c.length; if (sz < 512 * 1024) chunks.push(c); else if (sz === c.length + 512 * 1024) res.destroy(); });
      res.on("end", () => {
        clearTimeout(timer);
        const buf = Buffer.concat(chunks);
        let html: string;
        if (detectedEncoding === "utf-8" || detectedEncoding === "utf8") {
          html = buf.toString("utf-8");
        } else {
          try { html = new TextDecoder(detectedEncoding).decode(buf); } catch { html = buf.toString("utf-8"); }
        }
        const metaCharset = html.match(/<meta[^>]+charset=["']?([^"'\s;>]+)/i);
        if (metaCharset && metaCharset[1] !== detectedEncoding) {
          try { html = new TextDecoder(metaCharset[1]).decode(buf); } catch {}
        }
        ok({ html, finalUrl: url });
      });
    });
    req.on("error", (e: Error) => { clearTimeout(timer); no(e); });
    req.on("timeout", () => { req.destroy(); clearTimeout(timer); no(new Error("timeout")); });
  });
}

export function fetchHtml(url: string, depth?: number): Promise<FetchResult> {
  return httpBreaker.execute(
    () => fetchHtmlRaw(url, depth),
    (err: any) => {
      if (err) logger.debug({ url, error: err.message }, "fetch failed (circuit or error)");
      throw err;
    }
  );
}

function parseRobotsTxt(body: string): string[] {
  const blocked: string[] = [];
  let inOurAgent = false;
  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^user-agent:\s*\*/i.test(trimmed)) { inOurAgent = true; continue; }
    if (/^user-agent:/i.test(trimmed)) { inOurAgent = false; continue; }
    if (inOurAgent && /^disallow:\s*(.+)/i.test(trimmed)) {
      const path = trimmed.replace(/^disallow:\s*/i, "").trim();
      if (path) blocked.push(path);
    }
  }
  return blocked;
}

export async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;
    if (robotsCache.has(origin)) {
      const cached = robotsCache.get(origin);
      if (cached === null) return true;
      return !cached.some(p => parsed.pathname.startsWith(p));
    }
    const robotsUrl = origin + "/robots.txt";
    const res = await fetchHtml(robotsUrl);
    const blocked = parseRobotsTxt(res.html);
    robotsCache.set(origin, blocked.length > 0 ? blocked : null);
    if (robotsCache.size > ROBOTS_CACHE_MAX) {
      const iter = robotsCache.keys();
      for (let i = 0; i < ROBOTS_CACHE_MAX / 2; i++) { robotsCache.delete(iter.next().value!); }
    }
    return !blocked.some(p => parsed.pathname.startsWith(p));
  } catch {
    robotsCache.set(url as any, null);
    return true;
  }
}

export function parsePage(html: string, url: string): ParsedPage {
  const tM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = tM ? tM[1].replace(/\s+/g, " ").trim() : "";
  const dM = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDescription = dM ? dM[1].slice(0, 1000) : "";
  const oM = html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  const ogTitle = oM ? oM[1] : "";
  const odM = html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const ogDescription = odM ? odM[1].slice(0, 1000) : "";
  const lM = html.match(/<html[^>]*\slang=["']([a-z]{2,3})["']/i);
  const lang = lM ? lM[1] : "";
  const links: string[] = [];
  const re = /href=["']([^"'#]+)/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try { const a = new URL(m[1], url).toString(); if (a.startsWith("http")) links.push(a); } catch {}
  }
  return { title, metaDescription, ogTitle, ogDescription, lang, links, contentLength: html.length };
}

export { dnsCache, robotsCache };
