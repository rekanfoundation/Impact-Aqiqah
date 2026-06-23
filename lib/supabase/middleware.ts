import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Route publik (tanpa login). Laporan peserta: /r/{token} (docs/11, docs/15).
const PUBLIC_PATHS = ["/", "/login", "/daftar", "/checkout", "/sitemap", "/sitemap.xml", "/robots.txt"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/r/")) return true; // laporan publik bertoken
  if (pathname.startsWith("/checkout")) return true; // checkout guest + halaman sukses
  if (pathname.startsWith("/api/chat")) return true; // chatbot publik (docs/26)
  return false;
}

// Allowlist slug halaman CMS publik (docs/27) — di-cache agar tak query tiap request.
// Fail-safe: bila gagal/expired, route terproteksi tetap default-deny (PUBLIC_PATHS).
type SupabaseClient = ReturnType<typeof createServerClient>;
let cachedSlugs: Set<string> | null = null;
let cachedAt = 0;
const SLUG_TTL = 60_000;

async function isPublicCmsSlug(
  supabase: SupabaseClient,
  pathname: string,
): Promise<boolean> {
  // hanya path satu segmen (mis. /proses), bukan /a/b
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length !== 1) return false;
  const slug = segs[0];

  if (!cachedSlugs || Date.now() - cachedAt > SLUG_TTL) {
    try {
      const { data } = await supabase.rpc("get_cms_pages");
      const rows = (data ?? []) as { slug: string }[];
      cachedSlugs = new Set(rows.map((r) => r.slug));
      cachedAt = Date.now();
    } catch {
      // biarkan cache lama (bila ada); jangan buka akses bila tak yakin
      if (!cachedSlugs) return false;
    }
  }
  return cachedSlugs.has(slug);
}

/**
 * Menyegarkan sesi Supabase pada setiap request DAN menjaga route terproteksi.
 * Tanpa user -> redirect /login. User login membuka /login -> redirect /dashboard.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // PENTING: jangan jalankan kode di antara createServerClient dan getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Affiliate: tangkap ?ref=KODE -> cookie ia_ref (30 hari) untuk atribusi (docs M3)
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) {
    supabaseResponse.cookies.set("ia_ref", ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }

  // Belum login & mengakses route terproteksi -> ke /login
  // (halaman CMS publik docs/27 diizinkan via allowlist slug ter-cache)
  if (!user && !isPublicPath(pathname) && !(await isPublicCmsSlug(supabase, pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Sudah login & membuka /login -> ke /dashboard (akun area menangani role 'user')
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
