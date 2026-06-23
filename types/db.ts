// Tipe domain (row) ringan — selaras docs/05_DATABASE_DESIGN.
// Supabase client dipakai generik; hasil query di-cast ke tipe ini.

import type {
  OrderStatus,
  PaymentStatus,
  DocStatus,
  AnimalStatus,
  ScheduleStatus,
  IssueStatus,
  IssueSeverity,
} from "@/lib/status";

export type ServiceType = "aqiqah" | "qurban" | "sedekah_daging" | "nasi_box";
export type AnimalSpecies = "kambing" | "domba" | "sapi";
export type DocType = "photo" | "video" | "note";
export type DocStage = "slaughter" | "distribution" | "general";

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
}

export interface Location {
  id: string;
  branch_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export interface KambingMeta {
  tier?: string;
  harga_kambing?: number;
  biaya_masak?: number;
  hasil?: {
    sate_tusuk?: number;
    olahan_porsi?: number;
    semur_porsi?: number;
    gulai_porsi?: number;
  };
  cocok_untuk?: string;
}

export interface NasiBoxMeta {
  kode?: string;
  items?: string[];
}

export type ServiceMeta = KambingMeta & NasiBoxMeta & Record<string, unknown>;

export interface Service {
  id: string;
  type: ServiceType;
  name: string;
  /** Slug SEO publik (docs/28). Opsional pada data publik lama. */
  slug?: string | null;
  description: string | null;
  price: number; // harga jual
  /** Internal (admin only) — TIDAK diekspos ke publik. */
  vendor_price?: number;
  margin?: number;
  sort_order?: number;
  meta: ServiceMeta;
  is_active: boolean;
}

export interface Participant {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  participant_id: string;
  branch_id: string;
  created_by: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  notes: string | null;
  public_token: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  service_id: string;
  qty: number;
  unit_price: number;
  meta: Record<string, unknown>;
}

export interface Animal {
  id: string;
  order_id: string;
  tag_code: string | null;
  species: AnimalSpecies;
  weight_kg: number | null;
  status: AnimalStatus;
  on_behalf_of: string | null;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: string | null;
  proof_path: string | null;
  status: PaymentStatus;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface Schedule {
  id: string;
  order_id: string;
  location_id: string | null;
  pic_user_id: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: ScheduleStatus;
}

export interface Distribution {
  id: string;
  order_id: string;
  slaughter_record_id: string | null;
  recipient_name: string | null;
  recipient_area: string | null;
  packages_count: number;
  distributed_by: string | null;
  distributed_at: string;
}

export interface Documentation {
  id: string;
  order_id: string;
  animal_id: string | null;
  type: DocType;
  storage_path: string | null;
  caption: string | null;
  stage: DocStage;
  status: DocStatus;
  uploaded_by: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
}

export interface Issue {
  id: string;
  order_id: string;
  reported_by: string | null;
  severity: IssueSeverity;
  title: string;
  description: string | null;
  status: IssueStatus;
  resolved_at: string | null;
  created_at: string;
}

export interface ReportRow {
  id: string;
  order_id: string;
  pdf_path: string | null;
  public_token: string;
  generated_by: string | null;
  generated_at: string;
  version: number;
}

// View rows (docs/05 §7)
export interface OpenOrderRow {
  order_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  branch_name: string;
  location_name: string | null;
  pic_name: string | null;
  created_at: string;
  age_hours: number;
  open_issues: number;
  max_severity: string | null;
}

export interface OrderProgressRow {
  order_id: string;
  order_number: string;
  branch_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_animals: number;
  slaughtered_animals: number;
  distributed_animals: number;
  approved_docs: number;
  report_count: number;
  progress_potong: number;
  progress_distribusi: number;
  documentation_complete: boolean;
  has_report: boolean;
}

export interface BranchKpiRow {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  total_order: number;
  open_order: number;
  avg_progress_potong: number;
  avg_progress_distribusi: number;
  pct_documentation: number;
  pct_report: number;
}
