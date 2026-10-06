"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, HelpCircle, Search } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  faqItems,
  helpSections,
  HELP_GROUP_ORDER,
  type FaqItem,
  type HelpItem,
  type HelpSection,
} from "@/content/helpContent";

function SuperBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800 align-middle">
      Super admin
    </span>
  );
}

function BulletList({ items }: { items: HelpItem[] }) {
  return (
    <ul className="space-y-2 text-sm text-gray-700">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
          <span>
            {item.text}
            {item.superOnly && <SuperBadge />}
          </span>
        </li>
      ))}
    </ul>
  );
}

function sectionText(s: HelpSection, items: { features: HelpItem[]; tips: HelpItem[] }): string {
  return [
    s.title,
    s.purpose,
    ...(s.keywords ?? []),
    ...items.features.map((f) => f.text),
    ...items.tips.map((t) => t.text),
  ]
    .join(" ")
    .toLowerCase();
}

export default function HelpPage() {
  const admin = useAuthStore((state) => state.admin);
  const isSuper = admin?.type === "super_admin";
  const [query, setQuery] = useState("");

  // Role-filter content first, then apply search.
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return helpSections
      .filter((s) => isSuper || !s.superOnly)
      .map((s) => ({
        section: s,
        features: s.features.filter((f) => isSuper || !f.superOnly),
        tips: s.tips.filter((t) => isSuper || !t.superOnly),
      }))
      .filter(({ section, features, tips }) => !q || sectionText(section, { features, tips }).includes(q));
  }, [isSuper, query]);

  const faqs = useMemo<FaqItem[]>(() => {
    const q = query.trim().toLowerCase();
    return faqItems
      .filter((f) => isSuper || !f.superOnly)
      .filter((f) => !q || `${f.q} ${f.a} faq`.toLowerCase().includes(q));
  }, [isSuper, query]);

  const grouped = HELP_GROUP_ORDER.map((group) => ({
    group,
    items: sections.filter(({ section }) => section.group === group),
  })).filter((g) => g.items.length > 0);

  // Scroll to the anchor in the URL once content is rendered.
  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [isSuper]);

  const nothing = sections.length === 0 && faqs.length === 0;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <HelpCircle className="w-8 h-8 text-primary-600" />
          Help
        </h1>
        <p className="text-gray-600 mt-2">
          {isSuper
            ? "Documentation for every page and extension. Features only super admins can use are marked with a badge."
            : "Documentation for the pages and extensions available to you."}
        </p>
      </div>

      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help (e.g. credit, key, IP, template)…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav
          aria-label="Help contents"
          className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Contents</p>
          {grouped.map(({ group, items }) => (
            <div key={group} className="mb-4">
              <p className="mb-1 text-xs font-semibold text-gray-400">{group}</p>
              <ul className="space-y-0.5">
                {items.map(({ section }) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-700"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {faqs.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-400">Reference</p>
              <a
                href="#faq"
                className="block rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-700"
              >
                FAQ and troubleshooting
              </a>
            </div>
          )}
          {nothing && <p className="text-sm text-gray-500">No matches.</p>}
        </nav>

        <div className="space-y-6 min-w-0">
          {nothing && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No help topics match &quot;{query}&quot;.
            </div>
          )}

          {sections.map(({ section, features, tips }) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{section.group}</p>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {section.title}
                    {section.superOnly && <SuperBadge />}
                  </h2>
                </div>
                {section.route &&
                  (section.routeExternal ? (
                    <a
                      href={section.route}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800"
                    >
                      {section.routeLabel ?? "Open page"} <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      href={section.route}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800"
                    >
                      {section.routeLabel ?? "Open page"} →
                    </Link>
                  ))}
              </div>

              <p className="mt-3 text-sm text-gray-700">
                <span className="font-semibold text-gray-900">Purpose. </span>
                {section.purpose}
              </p>

              {features.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">What you can do</h3>
                  <BulletList items={features} />
                </div>
              )}

              {tips.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-amber-900">Tips and gotchas</h3>
                  <BulletList items={tips} />
                </div>
              )}
            </section>
          ))}

          {faqs.length > 0 && (
            <section id="faq" className="scroll-mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Reference</p>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">FAQ and troubleshooting</h2>
              <div className="divide-y divide-gray-100">
                {faqs.map((f) => (
                  <details key={f.id} id={f.id} className="group py-3" open={query.trim() !== ""}>
                    <summary className="cursor-pointer text-sm font-medium text-gray-900">
                      {f.q}
                      {f.superOnly && <SuperBadge />}
                    </summary>
                    <p className="mt-2 text-sm text-gray-700">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
