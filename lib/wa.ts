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
