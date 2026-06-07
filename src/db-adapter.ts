import { DB_BACKEND } from "./config";
import { Backend, Statement } from "./types";

interface WrappedStatement {
  run: (...args: any[]) => Promise<any>;
  get: (...args: any[]) => Promise<any>;
  all: (...args: any[]) => Promise<any>;
}

interface WrappedDb {
  _raw: any;
  prepare: (sql: string) => WrappedStatement;
  exec: (sql: string) => Promise<void>;
  pragma: (p: string) => Promise<void>;
  transaction: (fn: any) => (...args: any[]) => Promise<any>;
  close: () => Promise<void>;
}

function wrapStatement(stmt: Statement): WrappedStatement {
  return {
    run: (...args: any[]) => Promise.resolve(stmt.run.apply(stmt, args)),
    get: (...args: any[]) => Promise.resolve(stmt.get.apply(stmt, args)),
    all: (...args: any[]) => Promise.resolve(stmt.all.apply(stmt, args)),
  };
}

function wrapSyncDb(db: any): WrappedDb {
  return {
    _raw: db,
    prepare: (sql: string) => wrapStatement(db.prepare(sql)),
    exec: (sql: string) => { db.exec(sql); return Promise.resolve(); },
    pragma: (p: string) => { try { db.pragma(p); } catch {} return Promise.resolve(); },
    transaction: (fn: any) => {
      const tx = db.transaction(fn);
      return (...args: any[]) => Promise.resolve(tx(...args));
    },
    close: () => { try { db.close(); } catch {} return Promise.resolve(); },
  };
}

async function createBackend(): Promise<Backend> {
  if (DB_BACKEND === "pg") {
    const { getPool, initPgSchema, createPgStatements, createPgTransactions, PgCrawlState, closePg } = require("./db-pg");
    await initPgSchema();
    const stmts = await createPgStatements();
    const txn = await createPgTransactions(stmts);
    const state = new PgCrawlState(stmts);
    await state.fullRefresh();
    return {
      db: { _pg: true, close: closePg, exec: async () => {}, pragma: async () => {} },
      stmts,
      txn,
      state,
      isAsync: true,
      close: closePg,
    };
  }

  const { createDb, createStatements, createTransactions, CrawlState } = require("./db");
  const rawDb = createDb();
  const rawStmts = createStatements(rawDb);
  const rawTxn = createTransactions(rawDb, rawStmts);
  const state = new CrawlState(rawStmts);
  state.fullRefresh();

  const stmts = {} as Record<string, WrappedStatement>;
  for (const [key, val] of Object.entries(rawStmts)) {
    stmts[key] = wrapStatement(val as Statement);
  }

  const db = wrapSyncDb(rawDb);
  const txn = {
    saveNode: (d: any) => Promise.resolve(rawTxn.saveNode(d)),
    insertManyFrontier: (arr: any[]) => Promise.resolve(rawTxn.insertManyFrontier(arr)),
  };

  return { db, stmts: stmts as any, txn, state, isAsync: false, close: () => db.close() };
}

export { createBackend };
