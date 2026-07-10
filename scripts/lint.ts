import fs from "fs";
import path from "path";

const ROOT: string = path.join(__dirname, "..");
const SRC_DIRS = ["src", "tests"];
const FILES = ["server.ts", "crawler.ts"];
const EXTS = [".ts", ".js"];

let errors = 0;
let warnings = 0;

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      results.push(...walk(full));
    } else if (EXTS.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function lint(file: string): void {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, "utf8").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("console.log") && !rel.startsWith("tests")) {
      console.warn(`  WARN ${rel}:${i + 1} — use logger instead of console.log`);
      warnings++;
    }

    if (line.match(/require\(["']crypto["']\)/) && line.includes("randomUUID")) {
      console.warn(`  WARN ${rel}:${i + 1} — prefer counter-based requestId over crypto.randomUUID()`);
      warnings++;
    }

    if (line.match(/\bvar\b/) && !rel.includes("min")) {
      console.warn(`  WARN ${rel}:${i + 1} — use const/let instead of var`);
      warnings++;
    }

    if (line.includes("eval(")) {
      console.error(`  ERROR ${rel}:${i + 1} — eval() is not allowed`);
      errors++;
    }

    if (line.match(/(?:password|secret|token|api_key)\s*[:=]\s*["'][^"']+["']/i) && !rel.includes("test")) {
      console.error(`  ERROR ${rel}:${i + 1} — possible hardcoded secret`);
      errors++;
    }
  }

  const size = fs.statSync(file).size;
  if (size > 50000) {
    console.warn(`  WARN ${rel} — file is ${(size / 1024).toFixed(0)}KB, consider splitting`);
    warnings++;
  }
}

console.log("Linting...\n");

for (const dir of SRC_DIRS) {
  const full = path.join(ROOT, dir);
  if (fs.existsSync(full)) {
    for (const file of walk(full)) lint(file);
  }
}

for (const file of FILES) {
  const full = path.join(ROOT, file);
  if (fs.existsSync(full)) lint(full);
}

console.log(`\n${errors} errors, ${warnings} warnings`);
process.exit(errors > 0 ? 1 : 0);
