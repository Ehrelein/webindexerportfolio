import http from 'http';
import { fork, ChildProcess } from 'child_process';
import path from 'path';

let serverProcess: ChildProcess | undefined;
const PORT: number = 3099;
const BASE: string = `http://localhost:${PORT}`;

interface FetchResult {
  status: number | undefined;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function fetch(url: string): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    http.get(url, (res: http.IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: string | Buffer) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

beforeAll((done: jest.DoneCallback) => {
  serverProcess = fork(path.join(__dirname, '..', 'server.ts'), [], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, PORT: String(PORT) },
    execArgv: ['-r', 'ts-node/register']
  });
  serverProcess.on('error', () => {});
  setTimeout(done, 2000);
}, 10000);

afterAll(() => {
  if (serverProcess) serverProcess.kill();
});

describe('server API (integration)', () => {
  test('GET / returns HTML dashboard', async () => {
    const res: FetchResult = await fetch(BASE + '/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('LIVE');
  });

  test('GET /search returns HTML search page', async () => {
    const res: FetchResult = await fetch(BASE + '/search');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Search');
  });

  test('GET /api/stats returns JSON with required fields', async () => {
    const res: FetchResult = await fetch(BASE + '/api/stats');
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('frontier');
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('fail');
    expect(data).toHaveProperty('rate');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('domainsChecked');
  });

  test('GET /api/tree returns JSON with nodes', async () => {
    const res: FetchResult = await fetch(BASE + '/api/tree');
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.nodes)).toBe(true);
  });

  test('GET /api/search?q=test returns results array', async () => {
    const res: FetchResult = await fetch(BASE + '/api/search?q=test');
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);
  });

  test('GET /api/search without query returns empty', async () => {
    const res: FetchResult = await fetch(BASE + '/api/search');
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.results).toEqual([]);
  });
});
