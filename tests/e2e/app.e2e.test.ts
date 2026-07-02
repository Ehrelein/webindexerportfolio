import request from "supertest";

const BASE_URL = "http://localhost:3099";

describe("E2E: Full Application Flow", () => {
  test("dashboard loads", async () => {
    const res = await request(BASE_URL).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
  });

  test("search page loads", async () => {
    const res = await request(BASE_URL).get("/search");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
  });

  test("API stats returns data", async () => {
    const res = await request(BASE_URL).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("frontier");
    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("fail");
    expect(res.body).toHaveProperty("rate");
  });

  test("API search with query", async () => {
    const res = await request(BASE_URL).get("/api/search?q=python");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("results");
    expect(res.body).toHaveProperty("query", "python");
  });

  test("API search with empty query", async () => {
    const res = await request(BASE_URL).get("/api/search?q=");
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  test("API tree returns graph data", async () => {
    const res = await request(BASE_URL).get("/api/tree");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("nodes");
    expect(res.body).toHaveProperty("total");
  });

  test("health live endpoint", async () => {
    const res = await request(BASE_URL).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("timestamp");
  });

  test("health ready endpoint", async () => {
    const res = await request(BASE_URL).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("checks");
    expect(res.body.checks).toHaveProperty("uptime");
    expect(res.body.checks).toHaveProperty("memory");
  });

  test("metrics endpoint returns prometheus format", async () => {
    const res = await request(BASE_URL).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("# HELP webindexer_nodes_total");
    expect(res.text).toContain("# TYPE webindexer_nodes_total gauge");
  });

  test("docs endpoint returns swagger UI", async () => {
    const res = await request(BASE_URL).get("/docs");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
    expect(res.text).toContain("openapi");
  });

  test("rate limiting works", async () => {
    const requests = Array.from({ length: 110 }, () =>
      request(BASE_URL).get("/api/stats")
    );
    const results = await Promise.all(requests);
    const rateLimited = results.some((r) => r.status === 429);
    expect(rateLimited).toBe(true);
  });

  test("health checks under load", async () => {
    const requests = Array.from({ length: 50 }, () =>
      request(BASE_URL).get("/health/live")
    );
    const results = await Promise.all(requests);
    const allOk = results.every((r) => r.status === 200);
    expect(allOk).toBe(true);
  });
});
