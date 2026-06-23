import { marked } from "marked";

// Render Markdown → HTML untuk konten CMS (docs/27). Konten ditulis Super Admin
// (manager_program, tepercaya). Dipakai dengan container .prose + dangerouslySetInnerHTML.
export function renderMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return marked.parse(md, { async: false, gfm: true, breaks: true }) as string;
}
