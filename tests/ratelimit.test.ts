import { rateLimit, searchRateLimit } from "../src/ratelimit";

interface MockRequest {
  ip: string;
  connection: { remoteAddress: string };
  headers: Record<string, string>;
}

interface MockResponse {
  _status: number;
  _body: { error: string } | null;
  _headers: Record<string, string>;
  status: (s: number) => MockResponse;
  json: (b: { error: string }) => MockResponse;
  setHeader: (k: string, v: string | number) => void;
}

function makeReq(ip: string = "127.0.0.1"): MockRequest {
  return { ip, connection: { remoteAddress: ip }, headers: {} };
}

function makeRes(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _body: null,
    _headers: {},
    status(s: number) { this._status = s; return this; },
    json(b: { error: string }) { this._body = b; return this; },
    setHeader(k: string, v: string | number) { this._headers[k] = String(v); }
  };
  return res;
}

describe("rateLimit", () => {
  test("allows requests under limit", () => {
    const req: MockRequest = makeReq("test1");
    const res: MockResponse = makeRes();
    let nextCalled = false;
    (rateLimit as Function)(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(res._status).toBe(200);
  });

  test("blocks requests over limit", () => {
    const ip = "test2";
    for (let i = 0; i < 100; i++) (rateLimit as Function)(makeReq(ip), makeRes(), () => {});
    const req: MockRequest = makeReq(ip);
    const res: MockResponse = makeRes();
    let nextCalled = false;
    (rateLimit as Function)(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res._status).toBe(429);
    expect(res._body!.error).toContain("Too many requests");
  });
});

describe("searchRateLimit", () => {
  test("allows search requests under limit", () => {
    const req: MockRequest = makeReq("search1");
    const res: MockResponse = makeRes();
    let nextCalled = false;
    (searchRateLimit as Function)(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  test("blocks search requests over limit", () => {
    const ip = "search2";
    for (let i = 0; i < 30; i++) (searchRateLimit as Function)(makeReq(ip), makeRes(), () => {});
    const req: MockRequest = makeReq(ip);
    const res: MockResponse = makeRes();
    let nextCalled = false;
    (searchRateLimit as Function)(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res._status).toBe(429);
    expect(res._body!.error).toContain("Search rate limit");
  });
});
