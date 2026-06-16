import { createBackend } from "./src/db-adapter";
import { resolveDns } from "./src/fetcher";
import { initializeCrawl, startCrawlLoop } from "./src/queue";
import { startTreeRefresh } from "./src/tree";

const sendToParent = (msg: any): void => { if (process.send) process.send(msg); };

(async () => {
  const backend = await createBackend();
  const { db, stmts, txn, state, isAsync } = backend;

  startTreeRefresh(db, stmts, sendToParent, isAsync);

  await initializeCrawl(db, stmts, txn, state, resolveDns, isAsync);
  startCrawlLoop(db, stmts, txn, state, sendToParent, isAsync);
})();
