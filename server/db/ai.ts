import { createClient } from "@/lib/supabase/server";

export interface SavedAnalysis {
  id: string;
  kind: string;
  title: string | null;
  content: string;
  created_at: string;
}

/** Daftar analisis AI tersimpan (role pusat via RLS). Resilient bila tabel belum ada. */
export async function getSavedAnalyses(): Promise<SavedAnalysis[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ai_analyses")
      .select("id, kind, title, content, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []) as SavedAnalysis[];
  } catch {
    return [];
  }
}
