import { Client, ClientChannel, SFTPWrapper } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CMD: string = process.argv[2] || 'deploy';
const HOST: string = process.env.VPS_HOST || '45.77.23.140';
const PASS: string = process.env.VPS_PASS || '';
const DIR: string = __dirname;
const REMOTE_DIR = '/home/crawler/app';

if (!PASS && (CMD === 'deploy' || CMD === 'fix' || CMD === 'status' || CMD === 'logs')) {
  console.error('ERROR: Set VPS_PASS env variable. Example: $env:VPS_PASS="password"; node vps.js deploy');
  process.exit(1);
}

function run(c: Client, cmd: string): Promise<string> {
  return new Promise((resolve) => {
    c.exec(cmd, { pty: true }, (_e: Error | null, s: ClientChannel) => {
      let out = '';
      s.on('data', (d: Buffer) => { out += d; process.stdout.write(d.toString()); });
      s.stderr.on('data', (d: Buffer) => { out += d; process.stdout.write(d.toString()); });
      s.on('close', () => resolve(out));
    });
  });
}

function upload(c: Client, local: string, remote: string): Promise<void> {
  return new Promise((resolve, reject) => {
    c.sftp((_err: Error | null, sftp: SFTPWrapper) => {
      sftp.fastPut(path.join(DIR, local), remote, (err: Error | null) => {
        sftp.end();
        if (err) return reject(err);
        console.log('  uploaded ' + local);
        resolve();
      });
    });
  });
}

function uploadDir(c: Client, localRel: string, remoteAbs: string): Promise<void> {
  const localAbs = path.join(DIR, localRel);
  const entries = fs.readdirSync(localAbs, { withFileTypes: true });
  async function go(): Promise<void> {
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const localPath = path.join(localRel, e.name);
      const remotePath = remoteAbs + '/' + e.name;
      if (e.isDirectory()) {
        await run(c, 'mkdir -p ' + remotePath);
        await new Promise(r => setTimeout(r, 200));
        await uploadDir(c, localPath, remotePath);
      } else {
        await upload(c, localPath, remotePath);
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }
  return go();
}

async function deployFiles(c: Client): Promise<void> {
  console.log('  compiling TypeScript locally...');
  if (!fs.existsSync(path.join(DIR, 'dist', 'server.js'))) {
    console.error('  dist/ not found. Run "npx tsc" first.');
    process.exit(1);
  }
  await upload(c, 'dist/server.js', REMOTE_DIR + '/server.js');
  await upload(c, 'dist/crawler.js', REMOTE_DIR + '/crawler.js');
  await upload(c, 'package.json', REMOTE_DIR + '/package.json');
  await run(c, 'mkdir -p ' + REMOTE_DIR + '/src');
  await new Promise(r => setTimeout(r, 500));
  await uploadDir(c, 'dist/src', REMOTE_DIR + '/src');
  await run(c, 'mkdir -p ' + REMOTE_DIR + '/migrations');
  await new Promise(r => setTimeout(r, 500));
  await uploadDir(c, 'migrations', REMOTE_DIR + '/migrations');
  await run(c, 'mkdir -p ' + REMOTE_DIR + '/environments');
  await new Promise(r => setTimeout(r, 500));
  await uploadDir(c, 'environments', REMOTE_DIR + '/environments');
  await run(c, 'cd ' + REMOTE_DIR + ' && npm install --production 2>&1 | tail -5');
}

async function restart(c: Client): Promise<void> {
  await run(c, 'cd ' + REMOTE_DIR + ' && pm2 restart webindexer 2>/dev/null || (pm2 kill 2>/dev/null; sleep 1; pm2 start server.js --name webindexer --max-memory-restart 450M --node-args="--expose-gc")');
  await run(c, 'sleep 3');
  await run(c, 'curl -s -o /dev/null -w "dashboard: %{http_code}\\n" http://127.0.0.1:3000/');
  await run(c, 'curl -s -o /dev/null -w "search: %{http_code}\\n" http://127.0.0.1:3000/search');
  await run(c, 'pm2 list');
}

async function main(): Promise<void> {
  const c = new Client();
  await new Promise<void>((res, rej) => {
    c.on('ready', res).on('error', rej).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 10000 });
  });

  try {
    switch (CMD) {
      case 'deploy': {
        console.log('=== DEPLOY ===');
        await deployFiles(c);
        await restart(c);
        console.log('=== DONE ===');
        break;
      }
      case 'status': {
        console.log('=== STATUS ===');
        await run(c, 'pm2 list');
        await run(c, 'curl -s http://127.0.0.1:3000/api/stats 2>/dev/null || echo "server down"');
        await run(c, 'pm2 logs --lines 5 --nostream');
        console.log('=== DONE ===');
        break;
      }
      case 'logs': {
        const n = process.argv[3] || '30';
        await run(c, `pm2 logs --lines ${n} --nostream`);
        break;
      }
      case 'fix': {
        console.log('=== FIX (full restart) ===');
        await run(c, 'pm2 kill 2>/dev/null; sleep 1');
        await run(c, 'fuser -k 3000/tcp 3443/tcp 2>/dev/null; sleep 1');
        await deployFiles(c);
        await run(c, 'cd ' + REMOTE_DIR + ' && pm2 start server.js --name webindexer --max-memory-restart 350M --node-args="--expose-gc"');
        await run(c, 'sleep 4');
        await run(c, 'pm2 list');
        await run(c, 'curl -s -o /dev/null -w "dashboard: %{http_code}\\n" http://127.0.0.1:3000/');
        await run(c, 'curl -s -o /dev/null -w "search: %{http_code}\\n" http://127.0.0.1:3000/search');
        await run(c, 'pm2 logs --lines 5 --nostream');
        console.log('=== DONE ===');
        break;
      }
      case 'fetch': {
        const url = process.argv[3] || '/';
        const code = process.argv[4] || '';
        if (code) {
          await run(c, `curl -s "http://127.0.0.1:3000${url}" | sed -n "${code}"`);
        } else {
          await run(c, `curl -s "http://127.0.0.1:3000${url}" | cat -n`);
        }
        break;
      }
      case 'grep': {
        const q = process.argv[3] || 'onerror';
        await run(c, `grep -rn "${q}" ${REMOTE_DIR}/src/ ${REMOTE_DIR}/server.js ${REMOTE_DIR}/crawler.js`);
        break;
      }
      case 'html': {
        const url = process.argv[3] || '/';
        await run(c, `curl -s "http://127.0.0.1:3000${url}" | cat -n`);
        break;
      }
      default:
        console.log('Usage: ts-node vps.ts [deploy|status|logs|fix|fetch|grep|html] [args]');
        console.log('  deploy          - upload all files, restart');
        console.log('  status          - pm2 list + stats + logs');
        console.log('  logs [n]        - last n lines of pm2 logs');
        console.log('  fix             - kill all, upload, fresh start');
        console.log('  fetch /path     - curl page from server');
        console.log('  grep pattern    - grep in src/ on VPS');
        console.log('  html /path      - cat -n of page source');
    }
  } finally {
    c.end();
  }
}

main().catch((e: Error) => { console.error(e.message); process.exit(1); });
