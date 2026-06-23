// Helper WhatsApp via wa.me (docs/12 — MVP tanpa WA Business API).

/** Normalisasi nomor ke format internasional tanpa "+" / spasi. */
export function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d]/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  return p;
}

export function buildWaLink(phone: string, text: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

export function reportReadyMessage(opts: {
  name: string;
  service: string;
  orderNumber: string;
  link: string;
}): string {
  return (
    `Assalamu'alaikum ${opts.name}. Alhamdulillah ibadah ${opts.service} Anda ` +
    `(Order ${opts.orderNumber}) telah dilaksanakan. Lihat laporan & dokumentasi: ${opts.link}\n` +
    `— Zakat Sukses · ImpactAqiqah`
  );
}

/** Pesan handoff chatbot → admin (docs/26). Menyertakan pertanyaan user. */
export function chatHandoffMessage(question: string): string {
  return (
    "Halo Admin ImpactAqiqah,\n\n" +
    "Saya membutuhkan bantuan terkait:\n\n" +
    `${question}\n\n` +
    "Mohon bantuannya."
  );
}

// Template pesan WA siap pakai (wa.me) untuk Super Admin menghubungi user/cabang.
export interface WaTemplate {
  key: string;
  label: string;
  build: (v: { name?: string | null }) => string;
}

const SIGN = "\n— Zakat Sukses · ImpactAqiqah";
const greet = (name?: string | null) => `Assalamu'alaikum ${name ?? "Bapak/Ibu"}`;

export const WA_TEMPLATES: WaTemplate[] = [
  {
    key: "salam",
    label: "Salam & Perkenalan",
    build: ({ name }) => `${greet(name)}, perkenalkan kami dari ImpactAqiqah. Ada yang bisa kami bantu terkait layanan aqiqah Anda?${SIGN}`,
  },
  {
    key: "promo",
    label: "Promo Spesial",
    build: ({ name }) => `${greet(name)} 🎉 Ada promo spesial Aqiqah dari ImpactAqiqah! Hubungi kami untuk info paket & harga terbaik bulan ini.${SIGN}`,
  },
  {
    key: "followup",
    label: "Follow-up Pesanan",
    build: ({ name }) => `${greet(name)}, kami ingin menanyakan kelanjutan rencana aqiqah Anda. Apakah ada yang bisa kami bantu?${SIGN}`,
  },
  {
    key: "info",
    label: "Informasi Penting",
    build: ({ name }) => `${greet(name)}, ada informasi penting dari ImpactAqiqah untuk Anda.${SIGN}`,
  },
];
