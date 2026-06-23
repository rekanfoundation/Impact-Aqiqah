// ============================================================
// ImpactAqiqah — Dev Bootstrap (localhost)
// Menyiapkan database Supabase LIVE untuk pengembangan lokal:
//   1) Data master (app_settings, branches, locations, services tambahan)
//   2) Akun test tiap peran (manager_program / admin_cabang / petugas_lapangan)
//   3) (opsional --demo / default ON) data order contoh agar dashboard berisi
//
// Pakai service role (melewati RLS). Idempoten: aman dijalankan berulang.
// Jalankan:  node --env-file=.env.local scripts/dev-bootstrap.mjs [--demo|--no-demo]
//
// CATATAN: hanya membaca SUPABASE_SERVICE_ROLE_KEY dari env saat runtime;
//          tidak pernah mencetak/menyimpan secret.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    "✖ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum ter-set.\n" +
      "  Jalankan dengan: node --env-file=.env.local scripts/dev-bootstrap.mjs",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const WITH_DEMO = !args.includes("--no-demo"); // default ON, matikan dengan --no-demo
const DEV_PASSWORD = process.env.DEV_TEST_PASSWORD || "DevAqiqah#2026";

const db = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// UUID konsisten dengan supabase/seed.sql -------------------------------------
const BDG = "11111111-1111-1111-1111-111111111111";
const JKT = "22222222-2222-2222-2222-222222222222";
const LOC_BDG_1 = "aaaaaaa1-0000-0000-0000-000000000001";
const LOC_BDG_2 = "aaaaaaa1-0000-0000-0000-000000000002";
const LOC_JKT_1 = "aaaaaaa2-0000-0000-0000-000000000003";
const SVC_FAVORIT = "b0000001-0000-0000-0000-000000000002"; // paket Aqiqah Favorit (migration 14)
const SVC_QURBAN_KAMBING = "5e111111-0000-0000-0000-000000000002";

let failures = 0;
const ok = (label, error) => {
  if (error) {
    failures++;
    console.error(`  ✖ ${label}: ${error.message ?? error}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
};

// ----------------------------------------------------------------------------
// 1. DATA MASTER
// ----------------------------------------------------------------------------
async function seedMaster() {
  console.log("\n[1/3] Data master");

  ok(
    "app_settings (min_dp, SLA)",
    (
      await db.from("app_settings").upsert(
        [
          { key: "min_dp_ratio", value: { ratio: 0.5 }, description: "Minimal proporsi DP agar order bisa dijadwalkan" },
          { key: "sla_documentation_hours", value: { hours: 24 }, description: "SLA reminder dokumentasi" },
          { key: "sla_distribution_hours", value: { hours: 24 }, description: "SLA reminder distribusi" },
          { key: "sla_report_hours", value: { hours: 48 }, description: "SLA reminder laporan" },
        ],
        { onConflict: "key" },
      )
    ).error,
  );

  ok(
    "branches (Bandung, Jakarta)",
    (
      await db.from("branches").upsert(
        [
          { id: BDG, name: "Cabang Bandung", code: "BDG", address: "Jl. Soekarno Hatta, Bandung", phone: "022-0000001" },
          { id: JKT, name: "Cabang Jakarta", code: "JKT", address: "Jl. Sudirman, Jakarta", phone: "021-0000002" },
        ],
        { onConflict: "id" },
      )
    ).error,
  );

  ok(
    "locations (3)",
    (
      await db.from("locations").upsert(
        [
          { id: LOC_BDG_1, branch_id: BDG, name: "Masjid Al-Ikhlas", address: "Cibiru, Bandung", lat: -6.9289, lng: 107.7178 },
          { id: LOC_BDG_2, branch_id: BDG, name: "Balai Warga Antapani", address: "Antapani, Bandung", lat: -6.9175, lng: 107.6572 },
          { id: LOC_JKT_1, branch_id: JKT, name: "Masjid Sunda Kelapa", address: "Menteng, Jakarta", lat: -6.1988, lng: 106.8314 },
        ],
        { onConflict: "id" },
      )
    ).error,
  );

  ok(
    "services tambahan (Qurban, Sedekah)",
    (
      await db.from("services").upsert(
        [
          { id: SVC_QURBAN_KAMBING, type: "qurban", name: "Qurban Kambing", description: "Qurban 1 ekor kambing", price: 2500000, meta: { min_dp_ratio: 1.0 } },
          { id: "5e111111-0000-0000-0000-000000000003", type: "qurban", name: "Qurban Sapi 1/7", description: "Qurban patungan sapi 1/7", price: 3500000, meta: { min_dp_ratio: 1.0 } },
          { id: "5e111111-0000-0000-0000-000000000004", type: "sedekah_daging", name: "Sedekah Daging", description: "Paket sedekah daging", price: 150000, meta: {} },
        ],
        { onConflict: "id" },
      )
    ).error,
  );
}

// ----------------------------------------------------------------------------
// 2. AKUN TEST
// ----------------------------------------------------------------------------
const accounts = [
  { email: "care@rekanfoundation.com", role: "manager_program", branch_id: null, full_name: "Owner (Manager Program)", create: false },
  { email: "admin.bandung@dev.local", role: "admin_cabang", branch_id: BDG, full_name: "Admin Cabang Bandung", create: true },
  { email: "petugas.bandung@dev.local", role: "petugas_lapangan", branch_id: BDG, full_name: "Petugas Lapangan Bandung", create: true },
];

async function findUserIdByEmail(email) {
  // profiles.email unik; service role bisa baca.
  const { data } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

async function ensureAccount(acc) {
  let userId = await findUserIdByEmail(acc.email);

  if (!userId && acc.create) {
    const { data, error } = await db.auth.admin.createUser({
      email: acc.email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acc.full_name },
    });
    if (error) {
      // Mungkin user sudah ada di auth tapi profil belum ke-link — coba cari lagi.
      userId = await findUserIdByEmail(acc.email);
      if (!userId) {
        ok(`akun ${acc.email}`, error);
        return;
      }
    } else {
      userId = data.user.id;
    }
  }

  if (!userId) {
    ok(`akun ${acc.email}`, { message: "belum ada di Supabase Auth (buat dulu via dashboard / signup)" });
    return;
  }

  // Trigger handle_new_user sudah membuat baris profil; set role + branch + nama.
  const { error } = await db
    .from("profiles")
    .update({ role: acc.role, branch_id: acc.branch_id, full_name: acc.full_name, is_active: true })
    .eq("id", userId);
  ok(`akun ${acc.email} → ${acc.role}${acc.branch_id ? " @Bandung" : ""}`, error);
}

async function seedAccounts() {
  console.log("\n[2/3] Akun test");
  for (const acc of accounts) await ensureAccount(acc);
}

// ----------------------------------------------------------------------------
// 3. DEMO ORDER (opsional) — idempoten: lewati bila order contoh sudah ada
// ----------------------------------------------------------------------------
const ORD = {
  o1: "0d111111-0000-0000-0000-000000000001",
  o2: "0d111111-0000-0000-0000-000000000002",
  o3: "0d111111-0000-0000-0000-000000000003",
};
const PRT = {
  p1: "9a111111-0000-0000-0000-000000000001",
  p2: "9a111111-0000-0000-0000-000000000002",
};

async function seedDemo() {
  if (!WITH_DEMO) {
    console.log("\n[3/3] Demo order: dilewati (--no-demo)");
    return;
  }
  console.log("\n[3/3] Demo order");

  const { data: existing } = await db.from("orders").select("id").eq("id", ORD.o1).maybeSingle();
  if (existing) {
    console.log("  • order contoh sudah ada — lewati (idempoten)");
    return;
  }

  ok(
    "participants",
    (
      await db.from("participants").upsert(
        [
          { id: PRT.p1, name: "Ahmad Fauzi", phone: "6281200000001", email: "ahmad@example.id", address: "Bandung" },
          { id: PRT.p2, name: "Siti Aminah", phone: "6281200000002", email: "siti@example.id", address: "Jakarta" },
        ],
        { onConflict: "id" },
      )
    ).error,
  );

  ok(
    "orders (3 status berbeda)",
    (
      await db.from("orders").upsert(
        [
          { id: ORD.o1, participant_id: PRT.p1, branch_id: BDG, status: "new", payment_status: "unpaid", total_amount: 2325000, notes: "Aqiqah atas nama anak pertama" },
          { id: ORD.o2, participant_id: PRT.p1, branch_id: BDG, status: "documentation", payment_status: "paid", total_amount: 4650000, notes: "Aqiqah 2 ekor" },
          { id: ORD.o3, participant_id: PRT.p2, branch_id: JKT, status: "scheduled", payment_status: "partial", total_amount: 2500000, notes: "Qurban kambing" },
        ],
        { onConflict: "id" },
      )
    ).error,
  );

  ok(
    "order_items",
    (
      await db.from("order_items").upsert(
        [
          { id: "0e000001-0000-0000-0000-000000000001", order_id: ORD.o1, service_id: SVC_FAVORIT, qty: 1, unit_price: 2325000, meta: { on_behalf_of: "Muhammad Ali" } },
          { id: "0e000001-0000-0000-0000-000000000002", order_id: ORD.o2, service_id: SVC_FAVORIT, qty: 2, unit_price: 2325000, meta: { on_behalf_of: "Fatimah & Hasan" } },
          { id: "0e000001-0000-0000-0000-000000000003", order_id: ORD.o3, service_id: SVC_QURBAN_KAMBING, qty: 1, unit_price: 2500000, meta: {} },
        ],
        { onConflict: "id" },
      )
    ).error,
  );

  ok(
    "animals",
    (
      await db.from("animals").upsert(
        [
          { id: "a1111111-0000-0000-0000-000000000001", order_id: ORD.o1, tag_code: "BDG-001", species: "kambing", status: "registered", on_behalf_of: "Muhammad Ali" },
          { id: "a1111111-0000-0000-0000-000000000002", order_id: ORD.o2, tag_code: "BDG-002", species: "kambing", status: "distributed", on_behalf_of: "Fatimah" },
          { id: "a1111111-0000-0000-0000-000000000003", order_id: ORD.o2, tag_code: "BDG-003", species: "kambing", status: "slaughtered", on_behalf_of: "Hasan" },
          { id: "a1111111-0000-0000-0000-000000000004", order_id: ORD.o3, tag_code: "JKT-001", species: "kambing", status: "prepared", on_behalf_of: "Siti Aminah" },
        ],
        { onConflict: "id" },
      )
    ).error,
  );

  ok(
    "schedule (order #3)",
    (
      await db.from("schedules").upsert(
        [
          { id: "5c000001-0000-0000-0000-000000000003", order_id: ORD.o3, location_id: LOC_JKT_1, pic_user_id: null, scheduled_date: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), status: "planned" },
        ],
        { onConflict: "id" },
      )
    ).error,
  );

  ok(
    "issue terbuka (order #2 → litmus test)",
    (
      await db.from("issues").upsert(
        [
          { id: "15500001-0000-0000-0000-000000000002", order_id: ORD.o2, reported_by: null, severity: "high", title: "Dokumentasi distribusi belum lengkap", description: "Foto penyerahan paket belum diunggah", status: "open" },
        ],
        { onConflict: "id" },
      )
    ).error,
  );

  ok(
    "documentations (order #2)",
    (
      await db.from("documentations").upsert(
        [
          { id: "d0c00001-0000-0000-0000-000000000001", order_id: ORD.o2, animal_id: "a1111111-0000-0000-0000-000000000002", type: "photo", stage: "slaughter", status: "approved", caption: "Proses pemotongan BDG-002" },
          { id: "d0c00001-0000-0000-0000-000000000002", order_id: ORD.o2, animal_id: "a1111111-0000-0000-0000-000000000002", type: "photo", stage: "distribution", status: "pending", caption: "Penyerahan paket (menunggu validasi)" },
        ],
        { onConflict: "id" },
      )
    ).error,
  );
}

// ----------------------------------------------------------------------------
async function main() {
  console.log(`ImpactAqiqah dev-bootstrap → ${URL}`);
  console.log(`demo data: ${WITH_DEMO ? "ON" : "OFF"}`);

  await seedMaster();
  await seedAccounts();
  await seedDemo();

  console.log("\n────────────────────────────────────────────");
  if (failures === 0) {
    console.log("✅ Bootstrap selesai tanpa error.");
  } else {
    console.log(`⚠ Selesai dengan ${failures} error (lihat di atas).`);
  }
  console.log("\nAkun test (password dev — ganti/hapus sebelum go-live):");
  console.log(`  • care@rekanfoundation.com        → manager_program  (password: akun Anda sendiri)`);
  console.log(`  • admin.bandung@dev.local         → admin_cabang     (password: ${DEV_PASSWORD})`);
  console.log(`  • petugas.bandung@dev.local       → petugas_lapangan (password: ${DEV_PASSWORD})`);
  console.log("\nLanjut:  npm run dev  →  http://localhost:3000");

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("✖ Fatal:", e.message ?? e);
  process.exit(1);
});
