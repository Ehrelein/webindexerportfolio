import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const MIGRATIONS_DIR: string = path.join(__dirname);

function getAppliedMigrations(db: Database.Database): number[] {
  try {
    return db.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map((r: any) => r.version);
  } catch {
    return [];
  }
}

function getPendingMigrations(applied: number[]): string[] {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();
  return files.filter(f => {
    const version = parseInt(f.split("_")[0]);
    return !applied.includes(version);
  });
}

function runMigration(db: Database.Database, file: string): void {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
  const version = parseInt(file.split("_")[0]);

  console.log(`[migration] Applying ${file}...`);
  db.exec(sql);
  console.log(`[migration] Applied ${file} (version ${version})`);
}

function migrate(dbPath: string): void {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 15000");

  const applied = getAppliedMigrations(db);
  const pending = getPendingMigrations(applied);

  if (pending.length === 0) {
    console.log("[migration] No pending migrations");
    db.close();
    return;
  }

  console.log(`[migration] ${pending.length} pending migration(s)`);
  for (const file of pending) {
    try {
      runMigration(db, file);
    } catch (e: any) {
      console.error(`[migration] Failed: ${file}`, e.message);
      db.close();
      process.exit(1);
    }
  }

  console.log("[migration] All migrations applied");
  db.close();
}

if (require.main === module) {
  const dbPath = process.argv[2] || path.join(__dirname, "..", "crawler.db");
  migrate(dbPath);
}

export { migrate, getAppliedMigrations, getPendingMigrations };
