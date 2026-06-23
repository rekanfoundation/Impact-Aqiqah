"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildWaLink, WA_TEMPLATES } from "@/lib/wa";
import { ROLE_LABELS, type Profile, type UserRole } from "@/types/auth";
import type { Branch } from "@/types/db";
import {
  createUserAction,
  updateUserAction,
  toggleUserActiveAction,
  broadcastAction,
  type ActionState,
} from "@/server/actions/users";

const ASSIGNABLE: UserRole[] = ["direktur", "manager_program", "admin_pusat", "admin_cabang", "petugas_lapangan", "user"];
const input = "rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none";

export function UsersManager({ profiles, branches }: { profiles: Profile[]; branches: Branch[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "—";

  function run(fn: () => Promise<ActionState>, okMsg?: string) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setMsg(res.error);
      else {
        if (okMsg) setMsg(okMsg + (res.count != null ? ` (${res.count})` : ""));
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {msg && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-neutral-700">{msg}</p>}

      <Broadcast pending={pending} run={run} />
      <AddUser branches={branches} pending={pending} run={run} />

      <Card>
        <CardHeader title={`Daftar Akun (${profiles.length})`} />
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Nama / Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Cabang</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <UserRow key={p.id} p={p} branches={branches} branchName={branchName} pending={pending} run={run} />
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function UserRow({
  p,
  branches,
  branchName,
  pending,
  run,
}: {
  p: Profile;
  branches: Branch[];
  branchName: (id: string | null) => string;
  pending: boolean;
  run: (fn: () => Promise<ActionState>, okMsg?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: p.full_name ?? "", phone: p.phone ?? "", role: p.role, branch_id: p.branch_id ?? "" });
  const [tpl, setTpl] = useState(WA_TEMPLATES[0].key);

  if (editing) {
    return (
      <tr className="border-b border-neutral-50 bg-neutral-50/50">
        <td className="px-4 py-2">
          <input className={input + " w-full"} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nama" />
          <input className={input + " mt-1 w-full"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="No. WA" />
        </td>
        <td className="px-4 py-2">
          <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            {ASSIGNABLE.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2">
          <select className={input} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">— Pusat —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2" colSpan={2}>
          <button
            onClick={() => run(() => updateUserAction(p.id, form), "Tersimpan")}
            disabled={pending}
            className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Simpan
          </button>
          <button onClick={() => setEditing(false)} className="ml-2 px-2 py-1.5 text-xs text-neutral-500">Batal</button>
        </td>
      </tr>
    );
  }

  const waLink = p.phone ? buildWaLink(p.phone, WA_TEMPLATES.find((t) => t.key === tpl)!.build({ name: p.full_name })) : null;

  return (
    <tr className={`border-b border-neutral-50 ${!p.is_active ? "opacity-50" : ""}`}>
      <td className="px-4 py-2.5">
        <div className="font-medium text-neutral-800">{p.full_name ?? "—"}</div>
        <div className="text-xs text-neutral-400">{p.email}</div>
      </td>
      <td className="px-4 py-2.5"><Badge label={ROLE_LABELS[p.role]} tone="neutral" /></td>
      <td className="px-4 py-2.5">{branchName(p.branch_id)}</td>
      <td className="px-4 py-2.5">
        {p.is_active ? <Badge label="Aktif" tone="success" /> : <Badge label="Ditangguhkan" tone="danger" />}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button onClick={() => setEditing(true)} className="text-[var(--color-primary)] hover:underline">Edit</button>
          <button
            onClick={() => run(() => toggleUserActiveAction(p.id, p.is_active))}
            disabled={pending}
            className="text-neutral-600 hover:underline"
          >
            {p.is_active ? "Tangguhkan" : "Aktifkan"}
          </button>
          {p.phone && (
            <>
              <select value={tpl} onChange={(e) => setTpl(e.target.value)} className="rounded border border-neutral-300 px-1 py-0.5 text-xs">
                {WA_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
              <a href={waLink!} target="_blank" rel="noopener noreferrer" className="rounded bg-[var(--color-accent)] px-2 py-1 font-semibold text-white">
                💬 WA
              </a>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function AddUser({
  branches,
  pending,
  run,
}: {
  branches: Branch[];
  pending: boolean;
  run: (fn: () => Promise<ActionState>, okMsg?: string) => void;
}) {
  const [f, setF] = useState({ email: "", full_name: "", phone: "", role: "petugas_lapangan" as UserRole, branch_id: "" });
  return (
    <Card>
      <CardHeader title="Tambah Akun" />
      <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input className={input} placeholder="Email *" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={input} placeholder="Nama lengkap" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        <input className={input} placeholder="No. WhatsApp" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as UserRole })}>
          {ASSIGNABLE.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <select className={input} value={f.branch_id} onChange={(e) => setF({ ...f, branch_id: e.target.value })}>
          <option value="">— Pusat / tanpa cabang —</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button
          onClick={() => run(() => createUserAction(f), "Akun dibuat & magic link dikirim")}
          disabled={pending || !f.email}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
        >
          + Buat Akun
        </button>
      </CardBody>
    </Card>
  );
}

function Broadcast({
  pending,
  run,
}: {
  pending: boolean;
  run: (fn: () => Promise<ActionState>, okMsg?: string) => void;
}) {
  const [b, setB] = useState({ audience: "user" as "user" | "admin_cabang" | "internal" | "all", subject: "", message: "" });
  return (
    <Card>
      <CardHeader title="Broadcast (Email)" />
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <select className={input} value={b.audience} onChange={(e) => setB({ ...b, audience: e.target.value as typeof b.audience })}>
            <option value="user">Semua Customer (User)</option>
            <option value="admin_cabang">Semua Admin Cabang</option>
            <option value="internal">Semua Internal (non-customer)</option>
            <option value="all">Semua Akun</option>
          </select>
          <input className={input + " flex-1"} placeholder="Subjek" value={b.subject} onChange={(e) => setB({ ...b, subject: e.target.value })} />
        </div>
        <textarea className={input} rows={3} placeholder="Isi pesan / promo / informasi…" value={b.message} onChange={(e) => setB({ ...b, message: e.target.value })} />
        <button
          onClick={() => run(() => broadcastAction(b), "Broadcast terkirim")}
          disabled={pending || !b.subject || !b.message}
          className="self-start rounded-lg bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Kirim Broadcast
        </button>
        <p className="text-xs text-neutral-400">
          Dikirim via email (Brevo) ke seluruh penerima aktif pada audiens terpilih, dan dicatat sebagai notifikasi.
          Pesan WhatsApp massal otomatis butuh WA Business API; gunakan tombol WA per-akun untuk kirim manual.
        </p>
      </CardBody>
    </Card>
  );
}
