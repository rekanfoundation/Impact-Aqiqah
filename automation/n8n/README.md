# n8n Workflows — ImpactAqiqah

Definisi workflow otomasi (docs/18_AUTOMATION_WORKFLOW). Import file `*.json` ke n8n,
lalu isi credential & environment:

| Env (n8n) | Keterangan |
|-----------|------------|
| `IA_APP_URL` | Base URL aplikasi (mis. https://impactaqiqah.vercel.app) |
| `IA_WEBHOOK_SECRET` | Sama dengan `N8N_WEBHOOK_SECRET` di app (.env) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Akses DB (RPC reminder) |
| Kredensial SMTP / WhatsApp | Untuk pengiriman aktual |

## Daftar Workflow
| File | Pemicu | Aksi |
|------|--------|------|
| `wf-reminders.json` | Cron tiap jam | Panggil RPC `enqueue_due_reminders()` lalu dispatch outbox |
| `wf-dispatch-outbox.json` | Cron 5 menit / webhook | `POST /api/internal/notifications/dispatch` → kirim WA/Email dari payload |

## Catatan
- Reminder & outbox memakai tabel `notifications` (outbox pattern, docs/12).
- Pengiriman aktual WA/Email dilakukan node n8n dari `payload` (mis. `wa_link`, `subject`).
- `enqueue_due_reminders()` idempoten per window SLA (tidak menggandakan).
