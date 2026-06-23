"use client";

import { useMemo, useState, useTransition } from "react";
import type { Service } from "@/types/db";
import { createGuestOrderAction, type CheckoutPayload } from "@/server/actions/checkout";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function minDeliveryDate(): string {
  const d = new Date(Date.now() + 3 * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function CheckoutForm({
  kambing,
  nasiBox,
  preselect,
}: {
  kambing: Service[];
  nasiBox: Service[];
  preselect?: string;
}) {
  const preKambing = kambing.find((k) => k.id === preselect)?.id ?? kambing[0]?.id ?? "";

  const [gender, setGender] = useState<"L" | "P" | "">("");
  const [kambingId, setKambingId] = useState(preKambing);
  const [qty, setQty] = useState(1);
  const [nasiId, setNasiId] = useState("");
  const [nasiQty, setNasiQty] = useState(1);
  const [type, setType] = useState<"salur" | "kirim">("salur");

  const [pemesan, setPemesan] = useState({ name: "", phone: "", email: "" });
  const [child, setChild] = useState({ child_name: "", child_bin_binti: "" });
  const [addr, setAddr] = useState({ alamat: "", provinsi: "", kota: "", kecamatan: "", kelurahan: "", patokan: "" });
  const [delivery, setDelivery] = useState({ date: "", time: "" });
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickGender(g: "L" | "P") {
    setGender(g);
    setQty(g === "L" ? 2 : 1); // rekomendasi: laki-laki 2 ekor, perempuan 1 ekor
  }

  const kambingSvc = kambing.find((k) => k.id === kambingId);
  const nasiSvc = nasiBox.find((n) => n.id === nasiId);
  const total = useMemo(() => {
    let t = (kambingSvc?.price ?? 0) * qty;
    if (nasiSvc) t += nasiSvc.price * nasiQty;
    return t;
  }, [kambingSvc, qty, nasiSvc, nasiQty]);

  function submit() {
    setError(null);
    if (!kambingId) return setError("Pilih paket kambing dulu.");
    if (!pemesan.name || !pemesan.email || !pemesan.phone)
      return setError("Nama, email, dan No. WhatsApp pemesan wajib diisi.");
    if (type === "kirim" && (!addr.alamat || !delivery.date))
      return setError("Untuk Aqiqah Kirim, alamat dan tanggal pengantaran wajib diisi.");

    const items = [{ service_id: kambingId, qty }];
    if (nasiId) items.push({ service_id: nasiId, qty: nasiQty });

    const payload: CheckoutPayload = {
      items,
      aqiqah_type: type,
      child_name: child.child_name,
      child_bin_binti: child.child_bin_binti,
      child_gender: gender,
      pemesan,
      delivery,
      address: type === "kirim" ? addr : {},
      notes,
    };

    startTransition(async () => {
      const res = await createGuestOrderAction(payload);
      // sukses → action redirect (navigasi). Bila kembali, berarti ada error.
      if (res?.error) setError(res.error);
    });
  }

  const label = "mb-1 block text-sm font-medium text-neutral-700";
  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Kolom kiri: form */}
      <div className="flex flex-col gap-5">
        {/* Gender → rekomendasi jumlah */}
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-neutral-800">1. Aqiqah untuk</h3>
          <div className="flex gap-3">
            {(["L", "P"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => pickGender(g)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                  gender === g
                    ? "border-[var(--color-primary)] bg-amber-50 text-[var(--color-primary-dark)]"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {g === "L" ? "👦 Anak Laki-laki" : "👧 Anak Perempuan"}
                <span className="mt-0.5 block text-xs text-neutral-500">
                  Rekomendasi {g === "L" ? "2 ekor" : "1 ekor"}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Paket kambing */}
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-neutral-800">2. Paket Kambing</h3>
          <div className="flex flex-col gap-2">
            {kambing.map((k) => (
              <label
                key={k.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 ${
                  kambingId === k.id ? "border-[var(--color-primary)] bg-amber-50" : "border-neutral-200"
                }`}
              >
                <span className="flex items-center gap-2 text-sm">
                  <input type="radio" name="kambing" checked={kambingId === k.id} onChange={() => setKambingId(k.id)} />
                  <span className="font-medium text-neutral-800">{k.name}</span>
                </span>
                <span className="text-sm font-semibold text-neutral-700">{rupiah(k.price)}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={label + " mb-0"}>Jumlah ekor</span>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className={input + " w-20"}
            />
          </div>
        </section>

        {/* Nasi box opsional */}
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-neutral-800">3. Nasi Box (opsional)</h3>
          <select value={nasiId} onChange={(e) => setNasiId(e.target.value)} className={input}>
            <option value="">— Tidak pakai —</option>
            {nasiBox.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} — {rupiah(n.price)}
              </option>
            ))}
          </select>
          {nasiId && (
            <div className="mt-2 flex items-center gap-2">
              <span className={label + " mb-0"}>Jumlah box</span>
              <input
                type="number"
                min={1}
                value={nasiQty}
                onChange={(e) => setNasiQty(Math.max(1, Number(e.target.value)))}
                className={input + " w-20"}
              />
            </div>
          )}
        </section>

        {/* Tipe Salur / Kirim */}
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-neutral-800">4. Penyaluran</h3>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType("salur")}
              className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition ${
                type === "salur" ? "border-[var(--color-primary)] bg-amber-50" : "border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <span className="font-medium text-neutral-800">Aqiqah Salur</span>
              <span className="mt-0.5 block text-xs text-neutral-500">Disalurkan ImpactAqiqah ke santri penghafal Qur&apos;an &amp; dhuafa</span>
            </button>
            <button
              type="button"
              onClick={() => setType("kirim")}
              className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition ${
                type === "kirim" ? "border-[var(--color-primary)] bg-amber-50" : "border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <span className="font-medium text-neutral-800">Aqiqah Kirim</span>
              <span className="mt-0.5 block text-xs text-neutral-500">Diantar ke alamat Anda</span>
            </button>
          </div>
        </section>

        {/* Data pemesan + anak */}
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-neutral-800">5. Data Pemesan</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Nama Pemesan *</label>
              <input className={input} value={pemesan.name} onChange={(e) => setPemesan({ ...pemesan, name: e.target.value })} />
            </div>
            <div>
              <label className={label}>No. WhatsApp *</label>
              <input className={input} value={pemesan.phone} onChange={(e) => setPemesan({ ...pemesan, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
            </div>
            <div>
              <label className={label}>Email * (untuk akun &amp; lacak pesanan)</label>
              <input type="email" className={input} value={pemesan.email} onChange={(e) => setPemesan({ ...pemesan, email: e.target.value })} />
            </div>
            <div>
              <label className={label}>Nama Anak</label>
              <input className={input} value={child.child_name} onChange={(e) => setChild({ ...child, child_name: e.target.value })} />
            </div>
            <div>
              <label className={label}>Bin / Binti</label>
              <input className={input} value={child.child_bin_binti} onChange={(e) => setChild({ ...child, child_bin_binti: e.target.value })} placeholder="bin/binti …" />
            </div>
          </div>
        </section>

        {/* Alamat & jadwal (hanya Kirim) */}
        {type === "kirim" && (
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-neutral-800">6. Alamat &amp; Jadwal Pengantaran</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label}>Alamat Lengkap *</label>
                <input className={input} value={addr.alamat} onChange={(e) => setAddr({ ...addr, alamat: e.target.value })} />
              </div>
              <div>
                <label className={label}>Provinsi</label>
                <input className={input} value={addr.provinsi} onChange={(e) => setAddr({ ...addr, provinsi: e.target.value })} />
              </div>
              <div>
                <label className={label}>Kota / Kabupaten</label>
                <input className={input} value={addr.kota} onChange={(e) => setAddr({ ...addr, kota: e.target.value })} />
              </div>
              <div>
                <label className={label}>Kecamatan</label>
                <input className={input} value={addr.kecamatan} onChange={(e) => setAddr({ ...addr, kecamatan: e.target.value })} />
              </div>
              <div>
                <label className={label}>Kelurahan</label>
                <input className={input} value={addr.kelurahan} onChange={(e) => setAddr({ ...addr, kelurahan: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Catatan Patokan</label>
                <input className={input} value={addr.patokan} onChange={(e) => setAddr({ ...addr, patokan: e.target.value })} placeholder="mis. depan masjid, pagar hijau" />
              </div>
              <div>
                <label className={label}>Tanggal Pengantaran * (min. H-3)</label>
                <input type="date" min={minDeliveryDate()} className={input} value={delivery.date} onChange={(e) => setDelivery({ ...delivery, date: e.target.value })} />
              </div>
              <div>
                <label className={label}>Jam Pengantaran</label>
                <input type="time" className={input} value={delivery.time} onChange={(e) => setDelivery({ ...delivery, time: e.target.value })} />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Kolom kanan: ringkasan */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-neutral-800">Ringkasan</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">{kambingSvc?.name ?? "Kambing"} × {qty}</dt>
              <dd>{rupiah((kambingSvc?.price ?? 0) * qty)}</dd>
            </div>
            {nasiSvc && (
              <div className="flex justify-between">
                <dt className="text-neutral-500">{nasiSvc.name} × {nasiQty}</dt>
                <dd>{rupiah(nasiSvc.price * nasiQty)}</dd>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="text-[var(--color-primary-dark)]">{rupiah(total)}</dd>
            </div>
          </dl>

          <textarea
            placeholder="Catatan tambahan (opsional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={input + " mt-3"}
          />

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="mt-3 w-full rounded-lg bg-[var(--color-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
          >
            {pending ? "Memproses…" : "Bayar Sekarang"}
          </button>
          <p className="mt-2 text-center text-xs text-neutral-400">
            Tanpa perlu login. Pembayaran via iPaymu. Setelah bayar, akun &amp; akses affiliate dikirim ke email Anda.
          </p>
        </div>
      </aside>
    </div>
  );
}
