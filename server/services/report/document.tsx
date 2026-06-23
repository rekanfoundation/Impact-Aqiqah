import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Template laporan peserta (docs/11 §3). Hanya data ringkas + media tervalidasi.

export interface ReportData {
  order_number: string;
  status: string;
  participant: string | null;
  branch: string | null;
  created_at: string;
  schedule?: { date: string | null; location: string | null } | null;
  items: Array<{ name: string; qty: number }>;
  animals_total: number;
  animals_distributed: number;
  distributions: Array<{ recipient: string | null; area: string | null; packages: number }>;
  media: Array<{ type: string; stage: string; caption: string | null }>;
  narrative?: string | null;
}

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, color: "#0a0a0a", fontFamily: "Helvetica" },
  brand: { fontSize: 20, color: "#0E7C5A", fontWeight: 700 },
  tagline: { fontSize: 9, color: "#666", marginBottom: 16 },
  h2: { fontSize: 13, marginTop: 16, marginBottom: 6, color: "#0A5C43" },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 110, color: "#666" },
  value: { flex: 1 },
  item: { marginBottom: 2 },
  narrative: { marginBottom: 12, fontSize: 11, lineHeight: 1.5, color: "#333", fontStyle: "italic" },
  footer: { marginTop: 28, fontSize: 9, color: "#888", borderTop: "1 solid #eee", paddingTop: 8 },
});

export function ReportDocument({ data }: { data: ReportData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>ImpactAqiqah</Text>
        <Text style={s.tagline}>Tunaikan Ibadah, Tebarkan Manfaat — Laporan Pelaksanaan</Text>

        {data.narrative ? <Text style={s.narrative}>{data.narrative}</Text> : null}

        <View style={s.row}>
          <Text style={s.label}>Nomor Order</Text>
          <Text style={s.value}>{data.order_number}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Atas Nama</Text>
          <Text style={s.value}>{data.participant ?? "—"}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Cabang</Text>
          <Text style={s.value}>{data.branch ?? "—"}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Lokasi</Text>
          <Text style={s.value}>{data.schedule?.location ?? "—"}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Tanggal</Text>
          <Text style={s.value}>{data.schedule?.date ?? "—"}</Text>
        </View>

        <Text style={s.h2}>Layanan</Text>
        {data.items.map((it, i) => (
          <Text key={i} style={s.item}>
            • {it.name} × {it.qty}
          </Text>
        ))}

        <Text style={s.h2}>Pelaksanaan</Text>
        <Text style={s.item}>
          Hewan: {data.animals_distributed}/{data.animals_total} terdistribusi
        </Text>

        <Text style={s.h2}>Distribusi</Text>
        {data.distributions.length === 0 ? (
          <Text style={s.item}>—</Text>
        ) : (
          data.distributions.map((d, i) => (
            <Text key={i} style={s.item}>
              • {d.recipient ?? "—"} ({d.area ?? "—"}) — {d.packages} paket
            </Text>
          ))
        )}

        <Text style={s.h2}>Dokumentasi Tervalidasi</Text>
        {data.media.length === 0 ? (
          <Text style={s.item}>—</Text>
        ) : (
          data.media.map((m, i) => (
            <Text key={i} style={s.item}>
              • [{m.type}/{m.stage}] {m.caption ?? "—"}
            </Text>
          ))
        )}

        <Text style={s.footer}>
          Laporan ini dihasilkan otomatis oleh ImpactAqiqah · Zakat Sukses.
          Terima kasih atas kepercayaan Anda menunaikan ibadah bersama kami.
        </Text>
      </Page>
    </Document>
  );
}
