-- ============================================================
-- ImpactAqiqah — 26b Chatbot KB: kebijakan pembayaran via sistem
-- Tegaskan: pembayaran & pemesanan HANYA lewat sistem (checkout), bukan WhatsApp.
-- Idempoten: hanya insert bila belum ada.
-- ============================================================

insert into public.chatbot_kb (category, question, content, sort_order)
select
  'sop',
  'Bagaimana cara pembayaran?',
  'Pembayaran dilakukan secara online melalui sistem pembayaran resmi di website saat checkout (otomatis dan aman). Demi keamanan transaksi, kami TIDAK menerima pembayaran atau memproses pesanan melalui WhatsApp/transfer manual. Silakan selesaikan pemesanan lewat tombol Order/Pesan di website.',
  9
where not exists (
  select 1 from public.chatbot_kb where question = 'Bagaimana cara pembayaran?'
);
