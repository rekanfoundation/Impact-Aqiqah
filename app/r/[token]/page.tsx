import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Laporan Pelaksanaan" };

interface PublicReport {
  order_number: string;
  status: string;
  participant: string | null;
  branch: string | null;
  schedule: { date: string | null; location: string | null } | null;
  items: Array<{ name: string; qty: number }>;
  animals_total: number;
  animals_distributed: number;
  distributions: Array<{ recipient: string | null; area: string | null; packages: number }>;
  media: Array<{ type: string; stage: string; caption: string | null; path: string }>;
  report: { pdf_path: string | null; version: number } | null;
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Akses aman via RPC bertoken (anti-enumerasi). Tidak butuh login.
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_report", { p_token: token });
  if (!data) notFound();
  const r = data as PublicReport;

  // Signed URL untuk media tervalidasi (service role, hanya path yang sudah disaring RPC).
  let mediaUrls: Array<{ caption: string | null; url: string | null }> = [];
  try {
    const admin = createAdminClient();
    mediaUrls = await Promise.all(
      r.media.map(async (m) => {
        const { data: signed } = await admin.storage
          .from(BUCKET.documentation)
          .createSignedUrl(m.path, 900);
        return { caption: m.caption, url: signed?.signedUrl ?? null };
      }),
    );
  } catch {
    mediaUrls = r.media.map((m) => ({ caption: m.caption, url: null }));
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">ImpactAqiqah</h1>
        <p className="text-xs text-neutral-500">Tunaikan Ibadah, Tebarkan Manfaat</p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-800">Laporan Pelaksanaan</h2>
        <p className="mb-4 text-sm text-neutral-500">{r.order_number}</p>

        <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
          <dt className="text-neutral-500">Atas Nama</dt>
          <dd>{r.participant ?? "—"}</dd>
          <dt className="text-neutral-500">Cabang</dt>
          <dd>{r.branch ?? "—"}</dd>
          <dt className="text-neutral-500">Lokasi</dt>
          <dd>{r.schedule?.location ?? "—"}</dd>
          <dt className="text-neutral-500">Tanggal</dt>
          <dd>{formatDate(r.schedule?.date ?? null)}</dd>
        </dl>

        <h3 className="mt-5 mb-1 font-semibold text-neutral-700">Layanan</h3>
        <ul className="text-sm">
          {r.items.map((it, i) => (
            <li key={i}>• {it.name} × {it.qty}</li>
          ))}
        </ul>

        <h3 className="mt-5 mb-1 font-semibold text-neutral-700">Pelaksanaan</h3>
        <p className="text-sm">
          Hewan {r.animals_distributed}/{r.animals_total} terdistribusi.
        </p>
        {r.distributions.length > 0 && (
          <ul className="mt-1 text-sm text-neutral-600">
            {r.distributions.map((d, i) => (
              <li key={i}>• {d.recipient ?? "—"} ({d.area ?? "—"}) — {d.packages} paket</li>
            ))}
          </ul>
        )}

        <h3 className="mt-5 mb-2 font-semibold text-neutral-700">Dokumentasi</h3>
        {mediaUrls.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada dokumentasi tervalidasi.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {mediaUrls.map((m, i) =>
              m.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={m.url} alt={m.caption ?? "dokumentasi"} className="h-28 w-full rounded-lg object-cover" />
              ) : (
                <div key={i} className="flex h-28 items-center justify-center rounded-lg bg-neutral-100 p-2 text-center text-xs text-neutral-500">
                  {m.caption ?? "media"}
                </div>
              ),
            )}
          </div>
        )}

        {r.report?.pdf_path && (
          <a
            href={`/r/${token}/pdf`}
            className="mt-6 inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            ⬇ Unduh PDF
          </a>
        )}
      </div>

      <footer className="mt-6 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} Zakat Sukses · ImpactAqiqah
      </footer>
    </main>
  );
}
