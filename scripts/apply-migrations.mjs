// ============================================================
// ImpactAqiqah — Apply migrations ke Supabase live
// Konek langsung ke Postgres (butuh SUPABASE_DB_URL) lalu jalankan file .sql
// di supabase/migrations/ yang belum tercatat. Idempoten via tabel pelacak public._migrations.
//
// Mode:
//   (default)     apply migrasi yang belum tercatat, urut nama, berhenti di error pertama
//   --baseline    catat SEMUA file saat ini sebagai applied TANPA eksekusi
//                 (untuk DB yang sudah ter-migrasi manual — jalankan sekali)
//   --list        offline: tampilkan daftar file migrasi (tanpa konek DB)
//
// Jalankan: node --env-file=.env.local scripts/apply-migrations.mjs [mode]
// CATATAN: SUPABASE_DB_URL berisi password — hanya dari .env.local, tak pernah di-print.
// ============================================================

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIG_DIR = join(__dirname, "..", "supabase", "migrations");

const args = process.argv.slice(2);
const MODE = args.includes("--baseline") ? "baseline" : args.includes("--list") ? "list" : "apply";

function migrationFiles() {
  return readdirSync(MIG_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // nama berformat timestamp → urut kronologis
}

// ---- Mode offline: --list ----
if (MODE === "list") {
  const files = migrationFiles();
  console.log(`Migrasi di supabase/migrations/ (${files.length}):`);
  for (const f of files) console.log(`  • ${f}`);
  process.exit(0);
}

// ---- Mode konek DB ----
const URL = process.env.SUPABASE_DB_URL;
if (!URL) {
  console.error(
    "✖ SUPABASE_DB_URL belum di-set.\n" +
      "  Isi di .env.local dengan Session pooler URI dari Supabase\n" +
      "  (Settings → Database → Connection string → URI, port 5432), lalu:\n" +
      "    npm run db:baseline   # sekali, tandai migrasi lama sebagai applied\n" +
      "    npm run db:apply      # jalankan migrasi baru",
  );
  process.exit(1);
}

const { default: pg } = await import("pg");

// Host "direct" (db.<ref>.supabase.co) sering tak resolve (butuh IPv6). Sediakan
// fallback ke Session pooler. Password dipertahankan apa adanya (string replace).
function toPooler(s) {
  const m = s.match(/@db\.([a-z0-9]+)\.supabase\.co:/);
  if (!m) return null;
  const ref = m[1];
  return s
    .replace(/\/\/postgres:/, `//postgres.${ref}:`)
    .replace(/@db\.[a-z0-9]+\.supabase\.co:/, "@aws-1-ap-southeast-1.pooler.supabase.com:");
}

const candidates = [URL, toPooler(URL)].filter(Boolean);
let client;

async function connectAny() {
  let lastErr;
  for (const cs of candidates) {
    const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
    try {
      await c.connect();
      client = c;
      const host = cs.replace(/.*@([^:/]+).*/, "$1");
      console.log(`Terhubung ke ${host}`);
      return;
    } catch (e) {
      lastErr = e;
      try {
        await c.end();
      } catch {
        /* abaikan */
      }
    }
  }
  throw lastErr;
}

async function ensureTable() {
  await client.query(
    "create table if not exists public._migrations (" +
      "version text primary key, applied_at timestamptz not null default now())",
  );
}

async function appliedSet() {
  const { rows } = await client.query("select version from public._migrations");
  return new Set(rows.map((r) => r.version));
}

async function main() {
  const files = migrationFiles();
  await connectAny();
  try {
    await ensureTable();
    const done = await appliedSet();

    if (MODE === "baseline") {
      // --until=<14digit timestamp>: hanya tandai migrasi s/d versi itu (inklusif).
      // Berguna bila sebagian migrasi sudah diterapkan manual & sisanya belum.
      const untilArg = args.find((a) => a.startsWith("--until="))?.split("=")[1];
      let n = 0;
      for (const f of files) {
        if (done.has(f)) continue;
        if (untilArg && f.slice(0, 14) > untilArg) continue; // lewati yang lebih baru dari cutoff
        await client.query("insert into public._migrations (version) values ($1) on conflict do nothing", [f]);
        n++;
      }
      const scope = untilArg ? ` (s/d ${untilArg})` : "";
      console.log(`✅ Baseline${scope}: ${n} migrasi dicatat sebagai applied (tanpa eksekusi). Total tercatat: ${done.size + n}.`);
      return;
    }

    // MODE === "apply"
    const pending = files.filter((f) => !done.has(f));
    if (pending.length === 0) {
      console.log("✅ 0 pending — semua migrasi sudah diterapkan.");
      return;
    }
    console.log(`Menjalankan ${pending.length} migrasi pending…`);
    let applied = 0;
    for (const f of pending) {
      const sql = readFileSync(join(MIG_DIR, f), "utf8");
      try {
        await client.query(sql);
        await client.query("insert into public._migrations (version) values ($1) on conflict do nothing", [f]);
        applied++;
        console.log(`  ✓ applied ${f}`);
      } catch (e) {
        console.error(`  ✗ ${f}: ${e.message}`);
        console.error(`\n⛔ Berhenti. ${applied} migrasi sukses sebelum error ini. Perbaiki lalu jalankan ulang.`);
        process.exitCode = 1;
        return;
      }
    }
    console.log(`✅ Selesai: ${applied} migrasi diterapkan.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("✖ Fatal:", e.message ?? e);
  process.exit(1);
});
