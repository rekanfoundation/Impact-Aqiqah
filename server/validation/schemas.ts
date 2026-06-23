import { z } from "zod";

// Skema validasi input (docs/16 §12) — dipakai di Server Actions.

// ID berasal dari DB (tepercaya). Pakai pola UUID permisif — seed memakai UUID
// non-RFC (mis. b0000001-0000-0000-0000-...) yang ditolak z.uuid() Zod v4.
const uuid = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "ID tidak valid");

export const orderItemSchema = z.object({
  service_id: uuid,
  qty: z.coerce.number().int().min(1, "Minimal 1"),
  unit_price: z.coerce.number().min(0),
  on_behalf_of: z.string().trim().optional(),
});

export const animalInputSchema = z.object({
  species: z.enum(["kambing", "domba", "sapi"]),
  on_behalf_of: z.string().trim().optional(),
  tag_code: z.string().trim().optional(),
});

export const createOrderSchema = z.object({
  participant_name: z.string().trim().min(2, "Nama peserta wajib"),
  participant_phone: z.string().trim().optional(),
  participant_email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  branch_id: uuid,
  notes: z.string().trim().optional(),
  items: z.array(orderItemSchema).min(1, "Minimal 1 layanan"),
  animals: z.array(animalInputSchema).default([]),
});

export const transitionSchema = z.object({
  order_id: uuid,
  to: z.enum([
    "new",
    "paid",
    "scheduled",
    "preparation",
    "slaughtering",
    "distribution",
    "documentation",
    "reporting",
    "completed",
    "on_hold",
    "cancelled",
  ]),
});

export const paymentSchema = z.object({
  order_id: uuid,
  amount: z.coerce.number().min(1, "Jumlah harus > 0"),
  method: z.string().trim().default("transfer"),
  proof_path: z.string().trim().optional(),
});

export const scheduleSchema = z.object({
  order_id: uuid,
  location_id: uuid,
  pic_user_id: uuid,
  scheduled_date: z.string().min(1, "Tanggal wajib"),
  scheduled_time: z.string().optional(),
});

export const slaughterSchema = z.object({
  animal_id: uuid,
  order_id: uuid,
  notes: z.string().trim().optional(),
});

export const distributionSchema = z.object({
  order_id: uuid,
  recipient_name: z.string().trim().min(1, "Penerima wajib"),
  recipient_area: z.string().trim().optional(),
  packages_count: z.coerce.number().int().min(0).default(0),
});

export const serviceSchema = z.object({
  id: uuid.optional(),
  type: z.enum(["aqiqah", "qurban", "sedekah_daging", "nasi_box"]),
  name: z.string().trim().min(3, "Nama paket wajib"),
  slug: z.string().trim().optional(), // auto dari nama bila kosong
  description: z.string().trim().optional(),
  price: z.coerce.number().min(0, "Harga jual tidak valid"), // harga jual
  vendor_price: z.coerce.number().min(0, "Harga vendor tidak valid").default(0),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.boolean().default(true),
  // rincian kambing (opsional)
  harga_kambing: z.coerce.number().min(0).optional(),
  biaya_masak: z.coerce.number().min(0).optional(),
  sate_tusuk: z.coerce.number().int().min(0).optional(),
  olahan_porsi: z.coerce.number().int().min(0).optional(),
  semur_porsi: z.coerce.number().int().min(0).optional(),
  gulai_porsi: z.coerce.number().int().min(0).optional(),
  cocok_untuk: z.string().trim().optional(),
  // nasi box: daftar isi (JSON string array dari form)
  items: z.string().optional(),
});

export const issueSchema = z.object({
  order_id: uuid,
  severity: z.enum(["low", "medium", "high"]),
  title: z.string().trim().min(3, "Judul wajib"),
  description: z.string().trim().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
