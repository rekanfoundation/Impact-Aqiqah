"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth/session";
import {
  createOrderSchema,
  transitionSchema,
  paymentSchema,
  scheduleSchema,
  slaughterSchema,
  distributionSchema,
  issueSchema,
} from "@/server/validation/schemas";

export type ActionState = { ok?: boolean; error?: string } | undefined;

function fail(error: string): ActionState {
  return { ok: false, error };
}

// ---------- Create Order ----------
export async function createOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    participant_name: formData.get("participant_name"),
    participant_phone: formData.get("participant_phone") || undefined,
    participant_email: formData.get("participant_email") || undefined,
    branch_id: formData.get("branch_id"),
    notes: formData.get("notes") || undefined,
    items: JSON.parse(String(formData.get("items") ?? "[]")),
    animals: JSON.parse(String(formData.get("animals") ?? "[]")),
  };

  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    payload: {
      participant: {
        name: v.participant_name,
        phone: v.participant_phone,
        email: v.participant_email || undefined,
      },
      branch_id: v.branch_id,
      notes: v.notes,
      items: v.items.map((i) => ({
        service_id: i.service_id,
        qty: i.qty,
        unit_price: i.unit_price,
        meta: i.on_behalf_of ? { on_behalf_of: i.on_behalf_of } : {},
      })),
      animals: v.animals,
    },
  });

  if (error) return fail(error.message);

  revalidatePath("/orders");
  redirect(`/orders/${data as string}`);
}

// ---------- Transition status ----------
export async function transitionStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transitionSchema.safeParse({
    order_id: formData.get("order_id"),
    to: formData.get("to"),
  });
  if (!parsed.success) return fail("Input transisi tidak valid");

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_order_status", {
    p_order_id: parsed.data.order_id,
    p_to: parsed.data.to,
  });
  if (error) return fail(error.message);

  revalidatePath(`/orders/${parsed.data.order_id}`);
  revalidatePath("/orders");
  return { ok: true };
}

// ---------- Payment ----------
export async function addPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = paymentSchema.safeParse({
    order_id: formData.get("order_id"),
    amount: formData.get("amount"),
    method: formData.get("method") || "transfer",
    proof_path: formData.get("proof_path") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");

  const user = await getSessionUser();
  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    order_id: parsed.data.order_id,
    amount: parsed.data.amount,
    method: parsed.data.method,
    proof_path: parsed.data.proof_path,
    status: "partial",
    verified_by: user?.id ?? null,
    verified_at: new Date().toISOString(),
  });
  if (error) return fail(error.message);

  revalidatePath(`/orders/${parsed.data.order_id}`);
  return { ok: true };
}

// ---------- Schedule ----------
export async function setScheduleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = scheduleSchema.safeParse({
    order_id: formData.get("order_id"),
    location_id: formData.get("location_id"),
    pic_user_id: formData.get("pic_user_id"),
    scheduled_date: formData.get("scheduled_date"),
    scheduled_time: formData.get("scheduled_time") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");

  const supabase = await createClient();
  const { error } = await supabase.from("schedules").upsert(
    {
      order_id: parsed.data.order_id,
      location_id: parsed.data.location_id,
      pic_user_id: parsed.data.pic_user_id,
      scheduled_date: parsed.data.scheduled_date,
      scheduled_time: parsed.data.scheduled_time ?? null,
      status: "planned",
    },
    { onConflict: "order_id" },
  );
  if (error) return fail(error.message);

  revalidatePath(`/orders/${parsed.data.order_id}`);
  return { ok: true };
}

// ---------- Slaughter ----------
export async function recordSlaughterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = slaughterSchema.safeParse({
    animal_id: formData.get("animal_id"),
    order_id: formData.get("order_id"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return fail("Input tidak valid");

  const user = await getSessionUser();
  const supabase = await createClient();
  const { error } = await supabase.from("slaughter_records").insert({
    animal_id: parsed.data.animal_id,
    performed_by: user?.id ?? null,
    notes: parsed.data.notes,
  });
  if (error) return fail(error.message);

  await supabase
    .from("animals")
    .update({ status: "slaughtered" })
    .eq("id", parsed.data.animal_id);

  revalidatePath(`/orders/${parsed.data.order_id}`);
  return { ok: true };
}

// ---------- Distribution ----------
export async function recordDistributionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = distributionSchema.safeParse({
    order_id: formData.get("order_id"),
    recipient_name: formData.get("recipient_name"),
    recipient_area: formData.get("recipient_area") || undefined,
    packages_count: formData.get("packages_count") || 0,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");

  const user = await getSessionUser();
  const supabase = await createClient();
  const { error } = await supabase.from("distributions").insert({
    order_id: parsed.data.order_id,
    recipient_name: parsed.data.recipient_name,
    recipient_area: parsed.data.recipient_area,
    packages_count: parsed.data.packages_count,
    distributed_by: user?.id ?? null,
  });
  if (error) return fail(error.message);

  revalidatePath(`/orders/${parsed.data.order_id}`);
  return { ok: true };
}

// ---------- Issue ----------
export async function createIssueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = issueSchema.safeParse({
    order_id: formData.get("order_id"),
    severity: formData.get("severity"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");

  const user = await getSessionUser();
  const supabase = await createClient();
  const { error } = await supabase.from("issues").insert({
    order_id: parsed.data.order_id,
    reported_by: user?.id ?? null,
    severity: parsed.data.severity,
    title: parsed.data.title,
    description: parsed.data.description,
    status: "open",
  });
  if (error) return fail(error.message);

  revalidatePath(`/orders/${parsed.data.order_id}`);
  revalidatePath("/issues");
  return { ok: true };
}

export async function resolveIssueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("issue_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  if (!id) return fail("Issue tidak valid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/issues");
  return { ok: true };
}
