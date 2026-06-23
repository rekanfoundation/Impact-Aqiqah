// ============================================================
// ImpactAqiqah — E2E simulation (backend) untuk alur checkout guest.
// Menguji LOGIKA nyata terhadap DB live: create_guest_order → bayar (paid) →
// provision akun + magic link → atribusi & tier affiliate. Lalu BERSIHKAN data uji.
//
// Tidak menguji: halaman hosted iPaymu & callback webhook (butuh URL publik),
// klik magic link & penerimaan email (butuh email asli). Itu di checklist manual.
//
// Jalankan: node --env-file=.env.local scripts/e2e-checkout.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const FAVORIT = "b0000001-0000-0000-0000-000000000002"; // paket Aqiqah Favorit (2.325.000)
const REFERRER_EMAIL = "admin.bandung@dev.local";
const REFERRER_PASS = process.env.DEV_TEST_PASSWORD || "DevAqiqah#2026";
const GUEST_EMAIL = "e2e.guest@impactaqiqah.test";

let pass = 0, failc = 0;
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}${extra ? "  — " + extra : ""}`); }
  else { failc++; console.log(`  ✗ ${label}${extra ? "  — " + extra : ""}`); }
};
const yyyymmdd = (d) => d.toISOString().slice(0, 10);

async function findUserIdByEmail(email) {
  const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

async function cleanupGuest() {
  // hapus order uji (yang dibuat akun guest e2e) + auth user
  const uid = await findUserIdByEmail(GUEST_EMAIL);
  if (uid) {
    const { data: orders } = await admin.from("orders").select("id, participant_id").eq("customer_id", uid);
    for (const o of orders ?? []) {
      await admin.from("payments").delete().eq("order_id", o.id);
      await admin.from("order_items").delete().eq("order_id", o.id);
      await admin.from("distributions").delete().eq("order_id", o.id);
      await admin.from("orders").delete().eq("id", o.id);
      if (o.participant_id) await admin.from("participants").delete().eq("id", o.participant_id);
    }
    await admin.auth.admin.deleteUser(uid); // cascade hapus profil
  }
}

async function main() {
  console.log(`E2E checkout → bayar → akun → affiliate  (${URL})`);

  // ---- 0) bersihkan sisa uji sebelumnya + ambil referrer ----
  await cleanupGuest();
  const { data: ref } = await admin.from("profiles").select("id, affiliate_code").eq("email", REFERRER_EMAIL).maybeSingle();
  if (!ref?.affiliate_code) { console.log("✖ Referrer/affiliate_code tak ditemukan:", REFERRER_EMAIL); process.exit(1); }
  const refCode = ref.affiliate_code;

  // baseline affiliate referrer (login sbg referrer)
  const userClient = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signErr } = await userClient.auth.signInWithPassword({ email: REFERRER_EMAIL, password: REFERRER_PASS });
  if (signErr) { console.log("✖ Gagal login referrer:", signErr.message); process.exit(1); }
  const { data: base } = await userClient.rpc("get_my_affiliate");
  const baseGoats = base?.goats_period ?? 0;
  const baseCommission = base?.commission_estimate ?? 0;

  // ---- 1) CHECKOUT (create_guest_order) ----
  console.log("\n[1] Checkout (create_guest_order)");
  const today = new Date();
  const deliver = new Date(today.getTime() + 5 * 86400000);
  const payload = {
    items: [{ service_id: FAVORIT, qty: 2 }], // 2 ekor (anak laki-laki)
    aqiqah_type: "kirim",
    child_name: "Muhammad E2E",
    child_bin_binti: "bin Tester",
    child_gender: "L",
    pemesan: { name: "Pemesan E2E", phone: "081200000099", email: GUEST_EMAIL },
    delivery: { date: yyyymmdd(deliver), time: "10:00" },
    address: { alamat: "Jl. Uji 1", provinsi: "Jawa Barat", kota: "Bandung", kecamatan: "Cibiru", kelurahan: "Palasari", patokan: "depan masjid" },
    referral_code: refCode,
  };
  const { data: created, error: cErr } = await admin.rpc("create_guest_order", { payload });
  ok("create_guest_order sukses", !cErr && created?.order_id, cErr?.message);
  if (cErr) { await cleanupGuest(); process.exit(1); }
  const orderId = created.order_id, token = created.public_token;
  ok("total = 2 × 2.325.000", Number(created.total) === 4650000, `total=${created.total}`);

  // verifikasi kolom checkout
  const { data: ord } = await admin.from("orders").select("aqiqah_type, child_gender, delivery_address, referral_code, customer_id, status, payment_status, total_amount").eq("id", orderId).single();
  ok("aqiqah_type=kirim & gender=L", ord.aqiqah_type === "kirim" && ord.child_gender === "L");
  ok("alamat terstruktur tersimpan", ord.delivery_address?.kota === "Bandung");
  ok("referral_code teratribusi", ord.referral_code === refCode);
  ok("customer_id masih null (guest)", ord.customer_id === null);

  // ---- 2) BAYAR (simulasi pembayaran terverifikasi → transition paid) ----
  console.log("\n[2] Pembayaran (paid)");
  await admin.from("payments").insert({ order_id: orderId, amount: 4650000, method: "ipaymu", provider: "ipaymu", provider_ref: "E2E-" + orderId.slice(0, 8), status: "paid", verified_at: new Date().toISOString() });
  const { error: tErr } = await admin.rpc("transition_order_status", { p_order_id: orderId, p_to: "paid" });
  ok("transition_order_status → paid", !tErr, tErr?.message);
  const { data: ord2 } = await admin.from("orders").select("status, payment_status").eq("id", orderId).single();
  ok("status=paid & payment_status=paid", ord2.status === "paid" && ord2.payment_status === "paid", `${ord2.status}/${ord2.payment_status}`);

  // ---- 3) PROVISION AKUN + MAGIC LINK (seperti webhook provisionGuestAccount) ----
  console.log("\n[3] Akun + magic link");
  const { data: createdUser, error: uErr } = await admin.auth.admin.createUser({ email: GUEST_EMAIL, email_confirm: true, user_metadata: { full_name: "Pemesan E2E", role: "user" } });
  ok("createUser (akun guest)", !uErr && createdUser?.user?.id, uErr?.message);
  const guestId = createdUser?.user?.id;
  if (guestId) await admin.from("orders").update({ customer_id: guestId }).eq("id", orderId);
  const { data: prof } = await admin.from("profiles").select("role, affiliate_code").eq("id", guestId).maybeSingle();
  ok("profil guest role=user + punya affiliate_code", prof?.role === "user" && !!prof?.affiliate_code, `code=${prof?.affiliate_code}`);
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: GUEST_EMAIL, options: { redirectTo: (process.env.NEXT_PUBLIC_APP_URL ?? "") + "/akun" } });
  ok("magic link tergenerate", !!link?.properties?.action_link, link?.properties?.action_link ? "link OK" : "tidak ada link");

  // ---- 4) AFFILIATE (atribusi + tier) sebagai referrer ----
  console.log("\n[4] Affiliate referrer (tier)");
  const { data: aff } = await userClient.rpc("get_my_affiliate");
  ok("goats_period +2", (aff?.goats_period ?? 0) === baseGoats + 2, `dari ${baseGoats} → ${aff?.goats_period}`);
  ok("current_rate = 2,5% (≤10 ekor)", Number(aff?.current_rate) === 0.025, `rate=${aff?.current_rate}`);
  const expectedAdd = Math.round(4650000 * 0.025);
  ok("estimasi komisi naik ≈ 2,5% × 4.650.000", (aff?.commission_estimate ?? 0) >= baseCommission + expectedAdd - 1, `+${(aff?.commission_estimate ?? 0) - baseCommission} (≈${expectedAdd})`);

  // ---- 5) LAPORAN (sisi publik via token) ----
  console.log("\n[5] Laporan publik (get_public_report)");
  const { data: rep, error: rErr } = await admin.rpc("get_public_report", { p_token: token });
  ok("get_public_report mengembalikan order", !rErr && rep?.order_number, rErr?.message || rep?.order_number);

  // ---- cleanup ----
  console.log("\n[cleanup] menghapus data uji…");
  await cleanupGuest();
  const stillThere = await findUserIdByEmail(GUEST_EMAIL);
  ok("data uji dibersihkan", stillThere === null);

  console.log(`\n────────────────────────────\n${failc === 0 ? "✅ SEMUA LULUS" : "⚠ ADA GAGAL"}: ${pass} lulus, ${failc} gagal.`);
  process.exit(failc === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error("✖ Fatal:", e.message ?? e); try { await cleanupGuest(); } catch {} process.exit(1); });
