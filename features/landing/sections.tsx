import { waUrl, WA_DEFAULT_TEXT } from "@/lib/landing";

const SectionTitle = ({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) => (
  <div className="mx-auto mb-10 max-w-2xl text-center">
    {eyebrow && (
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
        {eyebrow}
      </span>
    )}
    <h2 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
      {title}
    </h2>
    {subtitle && <p className="mt-3 text-neutral-500">{subtitle}</p>}
  </div>
);

export function Hero() {
  return (
    <section className="bg-[var(--surface)]">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            ✦ AQIQAH BERKAH, DAMPAK KEBAIKAN BERKELANJUTAN
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl">
            Aqiqah Berkah untuk{" "}
            <span className="text-[var(--color-primary)]">Buah Hati Tercinta</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-neutral-600">
            Layanan aqiqah lengkap mulai dari pemilihan kambing, penyembelihan syar&apos;i,
            pengolahan higienis, hingga distribusi siap santap. Nikmati kemudahan beribadah
            dengan standar profesional.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={waUrl(WA_DEFAULT_TEXT)}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-3 font-semibold text-white hover:opacity-90"
            >
              💬 Pesan via WhatsApp
            </a>
            <a
              href="#paket"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Lihat Paket →
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-neutral-600">
            <Trust label="100% Halal MUI" />
            <Trust label="Penyembelihan Syar'i" />
            <Trust label="Dapur Higienis" />
          </div>
        </div>

        {/* Hero image placeholder */}
        <div className="relative">
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-orange-200 to-emerald-200 text-6xl shadow-sm">
            🍛
          </div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow">
            <span className="text-[var(--color-accent)]">★</span>
            <div className="text-xs">
              <div className="font-bold text-neutral-900">4.9/5 Rating</div>
              <div className="text-neutral-500">Dari 1000+ Keluarga</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[var(--color-accent)]">✓</span> {label}
    </span>
  );
}

const FEATURES = [
  { icon: "🐐", title: "Kambing Sehat", desc: "Pilihan kambing jantan/betina terbaik, sehat, cukup umur, dan memenuhi syarat sah aqiqah." },
  { icon: "📿", title: "Sesuai Syariat", desc: "Penyembelihan diawasi & dilakukan oleh tim ahli yang memahami syariat Islam." },
  { icon: "👨‍🍳", title: "Tim Profesional", desc: "Dapur higienis dengan koki berpengalaman menghasilkan masakan lezat tanpa bau prengus." },
];

export function Why() {
  return (
    <section id="proses" className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
      <SectionTitle
        title="Mengapa Memilih ImpactAqiqah?"
        subtitle="Kami menjamin setiap proses berjalan sesuai syariat dengan standar profesionalisme tinggi demi kenyamanan Anda."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-xl">
              {f.icon}
            </div>
            <h3 className="mt-4 font-semibold text-neutral-900">{f.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Gallery() {
  return (
    <section id="galeri" className="bg-[var(--surface)]">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
        <SectionTitle
          title="Galeri ImpactAqiqah"
          subtitle="Lihat proses aqiqah yang dilakukan secara syar'i, higienis, dan profesional."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {["🐐", "🍢"].map((g, i) => (
            <div
              key={i}
              className="flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 text-5xl"
            >
              {g}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  "Pilih Paket",
  "Konsultasi",
  "Pembayaran",
  "Penyembelihan",
  "Pengolahan",
  "Pengiriman",
];

export function Steps() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
      <SectionTitle
        title="Alur Pemesanan Mudah"
        subtitle="Hanya 6 langkah mudah untuk menunaikan aqiqah buah hati Anda."
      />
      <ol className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--color-primary)] font-bold text-[var(--color-primary)]">
              {i + 1}
            </div>
            <span className="mt-2 text-sm font-medium text-neutral-700">{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const TESTIMONIALS = [
  { name: "Ahmad", city: "Jakarta", text: "Alhamdulillah prosesnya sangat mudah dan syar'i. Masakannya enak sekali, terutama satenya empuk dan tidak bau prengus. Sangat direkomendasikan!" },
  { name: "Siti", city: "Depok", text: "Packaging-nya sangat modern dan rapi. Cocok sekali untuk dibagikan ke tetangga. Nasi kebulinya juara!" },
  { name: "Rizky", city: "Bekasi", text: "Dapat laporan dokumentasi lengkap dari video sembelih sampai packing. Jadi tenang karena tahu prosesnya benar-benar amanah." },
];

export function Testimonials() {
  return (
    <section className="bg-[var(--surface)]">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
        <SectionTitle title="Apa Kata Pelanggan Kami" subtitle="Ratusan keluarga telah mempercayakan aqiqah buah hati mereka kepada ImpactAqiqah." />
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="text-[var(--color-primary)]">★★★★★</div>
              <p className="mt-3 text-sm italic text-neutral-600">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">{t.name}</div>
                  <div className="text-xs text-neutral-500">{t.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Apakah kambingnya sehat dan layak?", a: "Ya. Seluruh kambing diperiksa kesehatannya, cukup umur, dan memenuhi syarat sah aqiqah sesuai syariat." },
  { q: "Bagaimana proses penyembelihannya?", a: "Penyembelihan dilakukan oleh tim ahli yang memahami syariat Islam dan diawasi untuk memastikan keabsahannya." },
  { q: "Apakah ada dokumentasi prosesnya?", a: "Ya, Anda menerima laporan dokumentasi (foto/video) dari proses penyembelihan hingga distribusi via link laporan." },
  { q: "Berapa lama waktu pemesanan?", a: "Disarankan memesan minimal H-1 agar penjadwalan, penyembelihan, dan pengolahan berjalan optimal." },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <SectionTitle title="Pertanyaan yang Sering Ditanyakan" />
      <div className="space-y-3">
        {FAQS.map((f) => (
          <details key={f.q} className="group rounded-xl border border-neutral-200 bg-white p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-neutral-800">
              {f.q}
              <span className="text-neutral-400 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-2 text-sm text-neutral-500">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CtaBanner() {
  return (
    <section className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">
      <div className="mx-auto max-w-[1280px] px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Siap Menunaikan Aqiqah dengan Mudah?
        </h2>
        <p className="mt-2 text-white/90">
          Konsultasikan kebutuhan aqiqah Anda sekarang dan nikmati layanan terbaik kami.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={waUrl(WA_DEFAULT_TEXT)}
            target="_blank"
            className="rounded-lg bg-white px-5 py-3 font-semibold text-[var(--color-primary)] hover:bg-neutral-100"
          >
            💬 Konsultasi via WhatsApp
          </a>
          <a
            href="#paket"
            className="rounded-lg border border-white/70 px-5 py-3 font-semibold text-white hover:bg-white/10"
          >
            Lihat Semua Paket
          </a>
        </div>
      </div>
    </section>
  );
}
