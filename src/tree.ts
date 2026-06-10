import { TREE_CACHE_TTL, DB_BACKEND } from "./config";
import type { Statements, TreeNode, TreeEdge } from "./types";

let treeLogCount = 0;

export async function refreshTreeCache(db: any, stmts: Statements, sendToServer: ((msg: any) => void) | undefined, isAsync: boolean): Promise<void> {
  try {
    let domainNodes: TreeNode[];
    if (db._pg) {
      const pool = require("./db-pg").getPool();
      const r1 = await pool.query(`SELECT url, title, domain, depth, parent, popularity, https FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY domain ORDER BY popularity DESC) as rn FROM nodes) sub WHERE rn = 1 ORDER BY popularity DESC LIMIT 200`);
      domainNodes = r1.rows;
    } else {
      domainNodes = db._raw.prepare(`SELECT url, title, domain, depth, parent, popularity, https FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY domain ORDER BY popularity DESC) as rn FROM nodes) WHERE rn = 1 ORDER BY popularity DESC LIMIT 200`).all();
    }

    treeLogCount++;
    if (treeLogCount <= 3 || treeLogCount % 30 === 0) console.log("[tree] domains=" + domainNodes.length + " log#" + treeLogCount);

    if (domainNodes.length > 0) {
      const domainSet = new Set(domainNodes.map(n => n.domain));
      let rawEdges: TreeEdge[];
      if (db._pg) {
        const pool = require("./db-pg").getPool();
        const r2 = await pool.query(`SELECT p.domain as src, n.domain as dst, COUNT(*) as w FROM nodes n INNER JOIN nodes p ON n.parent = p.url WHERE n.domain != p.domain GROUP BY p.domain, n.domain ORDER BY w DESC LIMIT 300`);
        rawEdges = r2.rows;
      } else {
        rawEdges = db._raw.prepare(`SELECT p.domain as src, n.domain as dst, COUNT(*) as w FROM nodes n INNER JOIN nodes p ON n.parent = p.url WHERE n.domain != p.domain GROUP BY p.domain, n.domain ORDER BY w DESC LIMIT 300`).all();
      }
      const edges = rawEdges.filter(e => domainSet.has(e.src) && domainSet.has(e.dst));
      const total = (await stmts.totalNodes.get()).c;
      if (sendToServer) sendToServer({ type: "tree", data: { nodes: domainNodes, edges: edges, total: total, domains: domainNodes.length } });
    } else {
      const fallback = await stmts.treeLight.all(150);
      const total = (await stmts.totalNodes.get()).c;
      if (sendToServer) sendToServer({ type: "tree", data: { nodes: fallback, edges: [], total: total, domains: 0 } });
    }
  } catch(e: any) { if (e.code !== 'SQLITE_BUSY') console.log("[tree] error:", e.message); }
}

export function startTreeRefresh(db: any, stmts: Statements, sendToServer: ((msg: any) => void) | undefined, isAsync: boolean): void {
  refreshTreeCache(db, stmts, sendToServer, isAsync);
  setInterval(() => refreshTreeCache(db, stmts, sendToServer, isAsync), TREE_CACHE_TTL);
}
