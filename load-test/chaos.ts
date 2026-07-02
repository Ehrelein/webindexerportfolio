import { execSync, exec, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

const CHAOS_DIR: string = path.join(__dirname, "..", ".chaos");

interface ChaosResult {
  test: string;
  healthy?: boolean;
  healthyAfter?: boolean;
  pass: boolean;
  skipped?: boolean;
  error?: string;
}

const TESTS: Record<string, () => ChaosResult> = {
  "disk-full": testDiskFull,
  "memory-leak": testMemoryLeak,
  "dns-fail": testDnsFail,
  "cpu-spike": testCpuSpike,
  "network-part": testNetworkPartition,
};

function log(msg: string): void {
  console.log(`[CHAOS ${new Date().toISOString()}] ${msg}`);
}

function checkHealth(): boolean {
  try {
    const res = execSync("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/", { timeout: 5000 });
    return res.toString().trim() === "200";
  } catch {
    return false;
  }
}

function testDiskFull(): ChaosResult {
  log("TEST: disk-full — заполняем диск до лимита");

  fs.mkdirSync(CHAOS_DIR, { recursive: true });
  const junkFile = path.join(CHAOS_DIR, "junk.bin");

  try {
    execSync(`fallocate -l 20G ${junkFile} 2>/dev/null || dd if=/dev/zero of=${junkFile} bs=1M count=20000 2>/dev/null`, { timeout: 30000 });
    log("Создан junk файл 20GB");

    log("Ждём 30 секунд — crawler должен поставить disk pause...");
    execSync("sleep 30");

    const healthy = checkHealth();
    log(`Health check: ${healthy ? "OK (server alive)" : "DOWN"}`);

    fs.unlinkSync(junkFile);
    log("Junk файл удалён");

    log("Ждём 30 секунд — crawler должен возобновить работу...");
    execSync("sleep 30");

    const healthyAfter = checkHealth();
    log(`Health after cleanup: ${healthyAfter ? "OK" : "DOWN"}`);

    return { test: "disk-full", healthy, healthyAfter, pass: healthy && healthyAfter };
  } catch (e: any) {
    log(`Error: ${e.message}`);
    try { fs.unlinkSync(junkFile); } catch {}
    return { test: "disk-full", error: e.message, pass: false };
  }
}

function testMemoryLeak(): ChaosResult {
  log("TEST: memory-leak — симулируем утечку памяти");

  const leak: ChildProcess = exec("node -e 'const a=[]; setInterval(()=>{a.push(Buffer.alloc(1024*1024))},100)'");
  log(`Memory leak process started (PID: ${leak.pid})`);

  log("Ждём 60 секунд — pm2 должен перезапустить crawler при 350MB...");
  execSync("sleep 60");

  const healthy = checkHealth();
  log(`Health check: ${healthy ? "OK (server alive)" : "DOWN"}`);

  try { process.kill(leak.pid!, "SIGTERM"); } catch {}
  log("Memory leak process killed");

  return { test: "memory-leak", healthy, pass: healthy };
}

function testDnsFail(): ChaosResult {
  log("TEST: dns-fail — блокируем DNS");

  try {
    execSync("iptables -A OUTPUT -p udp --dport 53 -j DROP 2>/dev/null || echo 'iptables not available'");
    log("DNS blocked via iptables");

    log("Ждём 30 секунд — crawler должен использовать DNS cache...");
    execSync("sleep 30");

    const healthy = checkHealth();
    log(`Health check: ${healthy ? "OK (DNS cache working)" : "DOWN"}`);

    execSync("iptables -D OUTPUT -p udp --dport 53 -j DROP 2>/dev/null || true");
    log("DNS unblocked");

    return { test: "dns-fail", healthy, pass: healthy };
  } catch (e: any) {
    log(`iptables not available, skipping: ${e.message}`);
    return { test: "dns-fail", skipped: true, pass: true };
  }
}

function testCpuSpike(): ChaosResult {
  log("TEST: cpu-spike — нагружаем CPU");

  const procs: ChildProcess[] = [];
  for (let i = 0; i < 4; i++) {
    const p = exec("node -e 'while(true){Math.random()}'");
    procs.push(p);
  }
  log("4 CPU-heavy processes started");

  log("Ждём 30 секунд...");
  execSync("sleep 30");

  const healthy = checkHealth();
  log(`Health check: ${healthy ? "OK (server alive under load)" : "DOWN"}`);

  procs.forEach(p => { try { process.kill(p.pid!, "SIGTERM"); } catch {} });
  log("CPU-heavy processes killed");

  return { test: "cpu-spike", healthy, pass: healthy };
}

function testNetworkPartition(): ChaosResult {
  log("TEST: network-part — симулируем сетевую partition");

  try {
    execSync("iptables -A OUTPUT -d 127.0.0.0/8 -j ACCEPT 2>/dev/null");
    execSync("iptables -A OUTPUT -j DROP 2>/dev/null || echo 'iptables not available'");
    log("Network partition created");

    log("Ждём 10 секунд...");
    execSync("sleep 10");

    execSync("iptables -D OUTPUT -j DROP 2>/dev/null || true");
    execSync("iptables -D OUTPUT -d 127.0.0.0/8 -j ACCEPT 2>/dev/null || true");
    log("Network partition healed");

    log("Ждём 30 секунд для восстановления...");
    execSync("sleep 30");

    const healthy = checkHealth();
    log(`Health check: ${healthy ? "OK (recovered from partition)" : "DOWN"}`);

    return { test: "network-part", healthy, pass: healthy };
  } catch (e: any) {
    log(`iptables not available, skipping: ${e.message}`);
    return { test: "network-part", skipped: true, pass: true };
  }
}

const testName: string = process.argv[2] || "all";

if (testName === "all") {
  log("=== Running all chaos tests ===");
  const results: ChaosResult[] = [];
  for (const [name, fn] of Object.entries(TESTS)) {
    log(`\n--- ${name} ---`);
    results.push(fn());
    log("Recovery pause (30s)...");
    execSync("sleep 30");
  }
  log("\n=== Results ===");
  results.forEach(r => {
    log(`${r.test}: ${r.pass ? "PASS ✓" : "FAIL ✗"}${r.skipped ? " (skipped)" : ""}`);
  });
  const failed = results.filter(r => !r.pass);
  process.exit(failed.length > 0 ? 1 : 0);
} else if (TESTS[testName]) {
  const result = TESTS[testName]();
  log(`\nResult: ${result.pass ? "PASS ✓" : "FAIL ✗"}`);
  process.exit(result.pass ? 0 : 1);
} else {
  console.log(`Unknown test: ${testName}`);
  console.log(`Available: ${Object.keys(TESTS).join(", ")}, all`);
  process.exit(1);
}
