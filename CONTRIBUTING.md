# Contributing

## Getting Started

```bash
git clone https://github.com/yourname/webindexerportfolio.git
cd webindexerportfolio
npm install
npm test
```

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes
4. Run tests: `npm test`
5. Run coverage: `npm run test:coverage`
6. Commit with a descriptive message
7. Push and create a PR

## Code Style

- **Language**: JavaScript (CommonJS modules)
- **Formatter**: No strict formatter, but follow existing style
- **Semicolons**: Yes
- **Quotes**: Double quotes for strings
- **Indentation**: 2 spaces
- **Line length**: ~120 chars max

### Naming Conventions

```javascript
// Variables/functions: camelCase
const frontierCount = 0;
function getDomain(url) {}

// Classes: PascalCase
class CrawlState {}

// Constants: UPPER_SNAKE_CASE
const MAX_DEPTH = 10;
const FETCH_TIMEOUT = 3500;

// Files: kebab-case or camelCase
src/config.js
src/fetcher.js
tests/config.test.js
```

## Testing

### Running Tests

```bash
npm test                    # all tests
npm run test:coverage       # with coverage
```

### Writing Tests

```javascript
// tests/example.test.js
const { getDomain } = require("../src/fetcher");

describe("getDomain", () => {
  test("extracts domain from URL", () => {
    expect(getDomain("https://example.com/path")).toBe("example.com");
  });
});
```

### Test Structure

```
tests/
├── config.test.js       # Config constants
├── db.test.js           # Database operations
├── fetcher.test.js      # HTTP fetch, DNS, robots.txt
├── seeds.test.js        # Seed generation
├── server.test.js       # API integration tests
├── ratelimit.test.js    # Rate limiting
├── metrics.test.js      # Prometheus metrics
├── logger.test.js       # Structured logging
└── swagger.test.js      # API documentation
```

### Coverage Targets

| Module | Target |
|--------|--------|
| config.js | 100% |
| db.js | 80%+ |
| fetcher.js | 70%+ |
| seeds.js | 60%+ |
| server.js | 80%+ |
| ratelimit.js | 90%+ |
| metrics.js | 80%+ |

## Project Structure

```
src/
├── config.js          # Constants, seeds, blacklist
├── db.js              # SQLite, CrawlState
├── fetcher.js         # HTTP, DNS, robots.txt
├── seeds.js           # Seed generation
├── queue.js           # Frontier, crawl loop
├── tree.js            # Domain graph
├── html.js            # Dashboard HTML
├── ratelimit.js       # Rate limiting
├── logger.js          # Pino logging
├── metrics.js         # Prometheus metrics
└── swagger.js         # OpenAPI docs
```

## Adding a New Feature

1. **Understand the architecture** — read `docs/adr/` for decisions
2. **Check TECH_DEBT.md** — don't add more tech debt
3. **Add tests** — every feature needs tests
4. **Update README** — if user-facing
5. **Add ADR** — if architectural decision

## Adding a New Endpoint

```javascript
// server.js
app.get("/api/new-endpoint", (req, res) => {
  // Validate input
  const param = req.query.param;
  if (!param) return res.json({ error: "Missing param" });

  // Business logic
  const result = doSomething(param);

  // Response
  res.json({ result });
});

// tests/server.test.js
test("GET /api/new-endpoint returns result", async () => {
  const res = await request(app).get("/api/new-endpoint?param=test");
  expect(res.status).toBe(200);
  expect(res.body.result).toBeDefined();
});
```

## PR Guidelines

- **Title**: Concise description (e.g., "Add rate limiting to API")
- **Description**: What, why, how
- **Tests**: All tests pass
- **Coverage**: No decrease
- **Size**: <500 lines changed (prefer smaller PRs)

## Questions?

Open an issue at https://github.com/yourname/webindexerportfolio/issues
