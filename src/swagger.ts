export const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Docs вЂ” WebIndexer</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: {
        openapi: "3.0.3",
        info: {
          title: "WebIndexer API",
          version: "1.0.0",
          description: "REST API for WebIndexer вЂ” web crawler and search indexer"
        },
        servers: [{ url: "", description: "Current server" }],
        paths: {
          "/api/stats": {
            get: {
              summary: "Get crawler statistics",
              description: "Returns current crawl statistics including node count, frontier size, error rate, and domain popularity.",
              tags: ["Stats"],
              responses: {
                200: {
                  description: "Crawl statistics",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          total: { type: "integer", description: "Total indexed nodes" },
                          frontier: { type: "integer", description: "URLs in frontier" },
                          domains: { type: "array", items: { type: "object", properties: { domain: { type: "string" }, c: { type: "integer" } } } },
                          success: { type: "integer", description: "Successful fetches" },
                          fail: { type: "integer", description: "Failed fetches" },
                          rate: { type: "string", description: "Pages per second" },
                          uptime: { type: "integer", description: "Uptime in seconds" },
                          domainsChecked: { type: "integer", description: "Unique domains checked" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "/api/search": {
            get: {
              summary: "Full-text search",
              description: "Search indexed pages using FTS5 prefix matching. Returns up to 30 results ranked by relevance.",
              tags: ["Search"],
              parameters: [
                {
                  name: "q",
                  in: "query",
                  required: true,
                  schema: { type: "string", minLength: 1, maxLength: 500 },
                  description: "Search query"
                }
              ],
              responses: {
                200: {
                  description: "Search results",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          results: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                url: { type: "string" },
                                title: { type: "string" },
                                metaDescription: { type: "string" },
                                ogTitle: { type: "string" },
                                ogDescription: { type: "string" },
                                domain: { type: "string" },
                                rank: { type: "number" }
                              }
                            }
                          },
                          query: { type: "string" },
                          error: { type: "string" }
                        }
                      }
                    }
                  }
                },
                429: {
                  description: "Rate limit exceeded",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: { error: { type: "string" } }
                      }
                    }
                  }
                }
              }
            }
          },
          "/api/tree": {
            get: {
              summary: "Get domain graph data",
              description: "Returns force-directed graph nodes and edges for domain visualization. Supports gzip compression.",
              tags: ["Graph"],
              responses: {
                200: {
                  description: "Graph JSON (optionally gzip-compressed)",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          nodes: { type: "array", items: { type: "object" } },
                          total: { type: "integer" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "/metrics": {
            get: {
              summary: "Prometheus metrics",
              description: "Returns metrics in Prometheus exposition format for scraping.",
              tags: ["Metrics"],
              responses: {
                200: {
                  description: "Prometheus metrics",
                  content: {
                    "text/plain": {
                      schema: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`;
