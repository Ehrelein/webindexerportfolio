import { SWAGGER_HTML } from "../src/swagger";

describe("SWAGGER_HTML", () => {
  test("is a valid HTML string", () => {
    expect(typeof SWAGGER_HTML).toBe("string");
    expect(SWAGGER_HTML).toContain("<!DOCTYPE html>");
    expect(SWAGGER_HTML).toContain("<title>API Docs");
    expect(SWAGGER_HTML).toContain("swagger-ui");
  });

  test("contains OpenAPI spec", () => {
    expect(SWAGGER_HTML).toContain("openapi");
    expect(SWAGGER_HTML).toContain("/api/stats");
    expect(SWAGGER_HTML).toContain("/api/search");
    expect(SWAGGER_HTML).toContain("/api/tree");
    expect(SWAGGER_HTML).toContain("/metrics");
  });

  test("includes all endpoint descriptions", () => {
    expect(SWAGGER_HTML).toContain("Get crawler statistics");
    expect(SWAGGER_HTML).toContain("Full-text search");
    expect(SWAGGER_HTML).toContain("Get domain graph data");
    expect(SWAGGER_HTML).toContain("Prometheus metrics");
  });
});
