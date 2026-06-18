"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white lg:block">
      <nav className="flex flex-col gap-0.5 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-emerald-50 font-medium text-[var(--color-primary-dark)]"
                  : "text-neutral-600 hover:bg-neutral-100",
              )}
            >
              <span aria-hidden>{item.glyph}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
