import { Request, Response, NextFunction } from "express";

export interface TreeNode {
  url: string;
  title: string;
  domain: string;
  depth: number;
  parent: string | null;
  popularity: number;
  https: number;
}

export interface TreeEdge {
  src: string;
  dst: string;
  w: number;
}

export interface TreeData {
  nodes: TreeNode[];
  edges: TreeEdge[];
  total: number;
  domains: number;
}

export interface CrawlStats {
  total: number;
  frontier: number;
  domains: DomainPop[];
  success: number;
  fail: number;
  rate: string;
  uptime: number;
  domainsChecked: number;
  domainsBlacklisted: number;
  totalFetchTime: number;
  concurrency: number;
}

export interface DomainPop {
  domain: string;
  c: number;
}

export interface PageData {
  url: string;
  title: string;
  desc: string;
  dom: string;
  depth: number;
  parent: string | null;
  pop: number;
  lang: string;
  https: number;
  meta: string;
  ogt: string;
  ogd: string;
  clen: number;
  ts: number;
  origUrl: string;
}

export interface FrontierItem {
  url: string;
  depth: number;
  parent: string | null;
  id?: number;
}

export interface DiskSpace {
  avail: number;
  total: number;
  used: number;
  usagePct: number;
}

export interface CircuitBreakerStatus {
  name: string;
  state: string;
  failureCount: number;
  lastFailure: number | null;
  uptime: number;
}

export interface CachedStats {
  nodeCount: number;
  frontierCount: number;
  success: number;
  fail: number;
  domainsChecked: number;
  domainsBlacklisted: number;
  totalFetchTime: number;
  concurrency: number;
}

export interface Statement {
  run: (...args: any[]) => any;
  get: (...args: any[]) => any;
  all: (...args: any[]) => any;
}

export interface Statements {
  insertNode: Statement;
  updatePop?: Statement;
  markVisited: Statement;
  isVisited: Statement;
  insertFrontier: Statement;
  getBatch: Statement;
  getMinId: Statement;
  clearProcessed: Statement;
  deleteFromFrontier: Statement;
  nodeCount: Statement;
  frontierCount: Statement;
  domainPopStmt: Statement;
  totalNodes?: Statement;
  insertFts: Statement;
  domainCountStmt: Statement;
  treeLight: Statement;
  rebuildFts: Statement;
  ftsCount: Statement;
  recrawlTargets: Statement;
  searchFts?: Statement;
}

export interface Transactions {
  saveNode: (d: PageData) => any;
  insertManyFrontier: (items: FrontierItem[]) => any;
}

export interface Backend {
  db: any;
  stmts: Statements;
  txn: Transactions;
  state: CrawlStateLike;
  isAsync: boolean;
  close: () => void | Promise<void>;
}

export interface CrawlStateLike {
  nodeCount: number;
  frontierCount: number;
  domainPop: DomainPop[];
  domainNodeCount: Map<string, number>;
  domainInflight: Map<string, number>;
  domainSuccess: Map<string, number>;
  domainFail: Map<string, number>;
  domainBlacklist: Set<string>;
  success: number;
  fail: number;
  diskPaused: boolean;
  _recrawlAttempted?: boolean;
  refresh(): void | Promise<void>;
  fullRefresh(): void | Promise<void>;
  getDomainCount(domain: string): number;
  incrementDomainCount(domain: string): void;
  recordDomainSuccess(domain: string): void;
  recordDomainFail(domain: string): void;
  isDomainBlacklisted(domain: string): boolean;
  getInflight(domain: string): number;
  setInflight(domain: string, val: number): void;
}

export interface ParsedPage {
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  lang: string;
  links: string[];
  contentLength: number;
}

export interface FetchResult {
  html: string;
  finalUrl: string;
}

export interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenMax?: number;
  monitorInterval?: number;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: boolean;
}
