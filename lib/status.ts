// Label & warna status (Bahasa Indonesia) — selaras docs/05 §5, docs/08, docs/14.

export type OrderStatus =
  | "new"
  | "paid"
  | "scheduled"
  | "preparation"
  | "slaughtering"
  | "distribution"
  | "documentation"
  | "reporting"
  | "completed"
  | "on_hold"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid";
export type DocStatus = "pending" | "approved_supervisor" | "approved" | "rejected";
export type AnimalStatus = "registered" | "prepared" | "slaughtered" | "distributed";
export type ScheduleStatus = "planned" | "ongoing" | "done";
export type IssueStatus = "open" | "in_progress" | "resolved";
export type IssueSeverity = "low" | "medium" | "high";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  primary: "bg-emerald-50 text-emerald-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

export function toneClass(tone: Tone): string {
  return TONE_CLASS[tone];
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  new: { label: "Baru", tone: "neutral" },
  paid: { label: "Dibayar", tone: "info" },
  scheduled: { label: "Dijadwalkan", tone: "info" },
  preparation: { label: "Persiapan", tone: "primary" },
  slaughtering: { label: "Pemotongan", tone: "primary" },
  distribution: { label: "Distribusi", tone: "primary" },
  documentation: { label: "Dokumentasi", tone: "warning" },
  reporting: { label: "Pelaporan", tone: "warning" },
  completed: { label: "Selesai", tone: "success" },
  on_hold: { label: "Tertahan", tone: "danger" },
  cancelled: { label: "Dibatalkan", tone: "danger" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  unpaid: { label: "Belum Bayar", tone: "danger" },
  partial: { label: "DP/Sebagian", tone: "warning" },
  paid: { label: "Lunas", tone: "success" },
};

export const DOC_STATUS: Record<DocStatus, { label: string; tone: Tone }> = {
  pending: { label: "Menunggu", tone: "neutral" },
  approved_supervisor: { label: "Lolos Supervisor", tone: "info" },
  approved: { label: "Tervalidasi", tone: "success" },
  rejected: { label: "Ditolak", tone: "danger" },
};

export const ANIMAL_STATUS: Record<AnimalStatus, { label: string; tone: Tone }> = {
  registered: { label: "Terdaftar", tone: "neutral" },
  prepared: { label: "Disiapkan", tone: "info" },
  slaughtered: { label: "Dipotong", tone: "primary" },
  distributed: { label: "Didistribusikan", tone: "success" },
};

export const ISSUE_SEVERITY: Record<IssueSeverity, { label: string; tone: Tone }> = {
  low: { label: "Rendah", tone: "neutral" },
  medium: { label: "Sedang", tone: "warning" },
  high: { label: "Tinggi", tone: "danger" },
};

export const ISSUE_STATUS: Record<IssueStatus, { label: string; tone: Tone }> = {
  open: { label: "Terbuka", tone: "danger" },
  in_progress: { label: "Diproses", tone: "warning" },
  resolved: { label: "Selesai", tone: "success" },
};

// ---- Transisi status order yang valid (state machine docs/08) ----
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["paid", "cancelled", "on_hold"],
  paid: ["scheduled", "cancelled", "on_hold"],
  scheduled: ["preparation", "on_hold"],
  preparation: ["slaughtering", "on_hold"],
  slaughtering: ["distribution", "on_hold"],
  distribution: ["documentation", "on_hold"],
  documentation: ["reporting", "on_hold"],
  reporting: ["completed", "on_hold"],
  completed: [],
  on_hold: ["scheduled", "paid", "new", "cancelled"],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
