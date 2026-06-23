"use client";

import { useState } from "react";
import { PagesManager } from "@/features/cms/pages-manager";
import { FaqManager } from "@/features/cms/faq-manager";
import { ContactSettings } from "@/features/cms/contact-settings";
import type { CmsPage, Faq, SiteContact } from "@/server/db/cms";

const TABS = [
  { key: "pages", label: "Halaman" },
  { key: "faq", label: "FAQ" },
  { key: "contact", label: "Kontak" },
] as const;

export function CmsTabs({
  pages,
  faqs,
  contact,
}: {
  pages: CmsPage[];
  faqs: Faq[];
  contact: SiteContact;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pages");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "flex-1 rounded-md bg-white px-3 py-1.5 font-semibold text-[var(--color-primary)] shadow-sm"
                : "flex-1 rounded-md px-3 py-1.5 text-neutral-600 hover:text-neutral-900"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pages" && <PagesManager pages={pages} />}
      {tab === "faq" && <FaqManager faqs={faqs} />}
      {tab === "contact" && <ContactSettings contact={contact} />}
    </div>
  );
}
