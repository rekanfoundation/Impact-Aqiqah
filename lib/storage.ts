// Helper Storage — penamaan path terstruktur (docs/17 §3).

export const BUCKET = {
  documentation: "documentation",
  paymentProofs: "payment-proofs",
  reports: "reports",
  publicAssets: "public-assets",
} as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * documentation/{branch_code}/{YYYY}/{MM}/{order_number}/{stage}/{uuid}.{ext}
 */
export function buildDocPath(opts: {
  branchCode: string;
  orderNumber: string;
  stage: string;
  ext: string;
  id?: string;
}): string {
  const now = new Date();
  const id = opts.id ?? crypto.randomUUID();
  return `${opts.branchCode}/${now.getFullYear()}/${pad(
    now.getMonth() + 1,
  )}/${opts.orderNumber}/${opts.stage}/${id}.${opts.ext}`;
}

/** reports/{order_number}/v{version}/{order_number}.pdf */
export function buildReportPath(orderNumber: string, version: number): string {
  return `${orderNumber}/v${version}/${orderNumber}.pdf`;
}

export function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
  };
  return map[mime] ?? "bin";
}
