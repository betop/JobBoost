/**
 * Client-side PDF generation for the admin panel.
 *
 * Renders the resume as real semantic HTML (headings, paragraphs, <ul><li>
 * bullet lists, one block per job/education/etc. entry) and hands it to the
 * browser's native print-to-PDF pipeline. This — unlike drawing text at
 * fixed x/y coordinates with jsPDF — keeps actual paragraph and list
 * structure in the resulting PDF's text layer, which is what most ATS
 * resume parsers rely on to tell entries and bullets apart. Word export
 * (docxDownload.ts) remains the most reliable option since ATS parsers read
 * .docx structure directly rather than inferring it from PDF text runs.
 */

import {
  ResumeData, ResumeHeader, CareerBreakdown, EducationEntry,
  CertEntry, ProjectEntry, AchievementEntry, LeadershipEntry, TextSegment,
  normalizeResumeData, parseMarkers, getSkillGroups,
} from "./resumeData";

// ─── HTML escaping + inline segment rendering ──────────────────────────────

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function segmentsToHtml(segs: TextSegment[]): string {
  return segs.map((s) => {
    let t = escapeHtml(s.text);
    if (s.bold) t = `<strong>${t}</strong>`;
    if (s.italic) t = `<em>${t}</em>`;
    return t;
  }).join("");
}

function markersToHtml(raw: string | undefined): string {
  return segmentsToHtml(parseMarkers(raw));
}

// ─── Template themes ────────────────────────────────────────────────────────

type HeaderStyle = "classic" | "band" | "centered" | "leftbar" | "plain-centered";
type SectionStyle = "rule" | "pill" | "centered-rule" | "square" | "dashed" | "dotted" | "tripledot" | "underline";

interface Theme {
  accent: string; dark: string; rule: string;
  header: HeaderStyle; section: SectionStyle;
  nameCase: "upper" | "lower";
  fontFamily?: string;
}

const THEMES: Record<number, Theme> = {
  1:  { accent: "#2563eb", dark: "#111827", rule: "#d1d5db", header: "classic",  section: "rule",          nameCase: "upper" },
  2:  { accent: "#059669", dark: "#064e3b", rule: "#a7f3d0", header: "classic",  section: "pill",          nameCase: "upper" },
  3:  { accent: "#7c3aed", dark: "#2e1065", rule: "#ddd6fe", header: "centered", section: "centered-rule", nameCase: "upper" },
  4:  { accent: "#dc2626", dark: "#7f1d1d", rule: "#fecaca", header: "leftbar",  section: "square",        nameCase: "upper" },
  5:  { accent: "#0284c7", dark: "#0c4a6e", rule: "#bae6fd", header: "band",     section: "rule",          nameCase: "upper" },
  6:  { accent: "#b45309", dark: "#78350f", rule: "#fde68a", header: "classic",  section: "dashed",        nameCase: "upper" },
  7:  { accent: "#0f766e", dark: "#134e4a", rule: "#99f6e4", header: "classic",  section: "dotted",        nameCase: "lower" },
  8:  { accent: "#4f46e5", dark: "#1e1b4b", rule: "#c7d2fe", header: "band",     section: "rule",          nameCase: "upper" },
  9:  { accent: "#ec4899", dark: "#831843", rule: "#fbcfe8", header: "band",     section: "rule",          nameCase: "upper" },
  10: { accent: "#64748b", dark: "#0f172a", rule: "#cbd5e1", header: "classic",  section: "tripledot",     nameCase: "upper" },
  11: { accent: "#000000", dark: "#000000", rule: "#000000", header: "plain-centered", section: "underline", nameCase: "upper", fontFamily: "Georgia, Cambria, 'Times New Roman', serif" },
};

const BODY = "#18181b";
const BODY_MUTED = "#3f3f46";
const GRAY = "#52525b";

// ─── Entry block builders ───────────────────────────────────────────────────

function contactLineHtml(h: ResumeHeader): string {
  const parts: string[] = [];
  if (h.location) parts.push(escapeHtml(h.location));
  if (h.email) parts.push(`<a href="mailto:${escapeHtml(h.email)}">${escapeHtml(h.email)}</a>`);
  if (h.phone) parts.push(escapeHtml(h.phone));
  if (h.linkedin) {
    const li = typeof h.linkedin === "object" ? h.linkedin : { display: String(h.linkedin), url: String(h.linkedin) };
    if (li.display) parts.push(li.url ? `<a href="${escapeHtml(li.url)}">${escapeHtml(li.display)}</a>` : escapeHtml(li.display));
  }
  if (h.github) {
    const gh = typeof h.github === "object" ? h.github : { display: String(h.github), url: String(h.github) };
    if (gh.display) parts.push(gh.url ? `<a href="${escapeHtml(gh.url)}">${escapeHtml(gh.display)}</a>` : escapeHtml(gh.display));
  }
  if (!parts.length) return "";
  return `<div class="rcontact">${parts.join('<span class="sep"> · </span>')}</div>`;
}

function jobEntryHtml(job: CareerBreakdown): string {
  const dateStr = job.date_range || [job.start, job.end || "Present"].filter(Boolean).join(" – ");
  const displayText = job.promotion_note || job.location || "";
  const bullets = job.highlights ?? job.bullets ?? [];
  return `
    <div class="rentry">
      <div class="rentry-top"><span class="rentry-title">${escapeHtml(job.title || job.job_title || "")}</span><span class="rentry-date">${escapeHtml(dateStr)}</span></div>
      <div class="rentry-sub"><span class="rentry-company">${escapeHtml(job.company || "")}</span>${displayText ? `<span class="rentry-loc">${escapeHtml(displayText)}</span>` : ""}</div>
      ${bullets.length ? `<ul class="rbullets">${bullets.map((b) => `<li>${markersToHtml(b)}</li>`).join("")}</ul>` : ""}
    </div>`;
}

function leadershipEntryHtml(role: LeadershipEntry): string {
  const dateStr = role.date || role.date_range || [role.start, role.end || "Present"].filter(Boolean).join(" – ");
  const bullets = role.highlights ?? role.bullets ?? [];
  return `
    <div class="rentry">
      <div class="rentry-top"><span class="rentry-title">${escapeHtml(role.name || role.role_name || "")}</span>${dateStr ? `<span class="rentry-date">${escapeHtml(dateStr)}</span>` : ""}</div>
      ${role.role ? `<div class="rentry-sub"><span class="rentry-company">${escapeHtml(role.role)}</span></div>` : ""}
      ${role.description ? `<p class="rentry-summary">${markersToHtml(role.description)}</p>` : ""}
      ${bullets.length ? `<ul class="rbullets">${bullets.map((b) => `<li>${markersToHtml(b)}</li>`).join("")}</ul>` : ""}
    </div>`;
}

function eduEntryHtml(edu: EducationEntry): string {
  const year = edu.year || edu.end || edu.dates || "";
  const inst = edu.institution || edu.school || "";
  const subParts = [inst, edu.location].filter(Boolean).join("  ·  ");
  const relevant = edu.Relevant || edu.relevant || "";
  return `
    <div class="rentry">
      <div class="rentry-top"><span class="rentry-title">${escapeHtml(edu.degree || edu.degree_name || "")}${edu.major ? `<span class="rentry-issuer"> · ${escapeHtml(edu.major)}</span>` : ""}</span>${year ? `<span class="rentry-date">${escapeHtml(year)}</span>` : ""}</div>
      ${subParts ? `<div class="rentry-sub"><span class="rentry-company">${escapeHtml(subParts)}</span></div>` : ""}
      ${edu.highlights ? `<p class="rentry-summary">${escapeHtml(edu.highlights)}</p>` : ""}
      ${relevant ? `<p class="rentry-summary"><strong>Relevant Coursework:</strong> ${escapeHtml(relevant)}</p>` : ""}
    </div>`;
}

function certEntryHtml(cert: CertEntry): string {
  const name = cert.name || cert.cert_name || "";
  const date = cert.date || "";
  const vp = cert.value_proposition || cert.description || "";
  return `
    <div class="rentry">
      <div class="rentry-top"><span class="rentry-title">${escapeHtml(name)}${cert.issuer ? `<span class="rentry-issuer"> · ${escapeHtml(cert.issuer)}</span>` : ""}</span>${date ? `<span class="rentry-date">${escapeHtml(date)}</span>` : ""}</div>
      ${vp ? `<p class="rentry-summary">${escapeHtml(vp)}</p>` : ""}
    </div>`;
}

function projectEntryHtml(proj: ProjectEntry): string {
  const name = proj.name || proj.project_name || "";
  const context = proj.date || proj.context || [proj.company, proj.year].filter(Boolean).join("  |  ");
  const tech = proj.tech ?? proj.tech_stack;
  const techStr = Array.isArray(tech) ? tech.join(", ") : (tech ? String(tech) : "");
  return `
    <div class="rentry">
      <div class="rentry-top"><span class="rentry-title">${escapeHtml(name)}</span>${context ? `<span class="rentry-date">${escapeHtml(context)}</span>` : ""}</div>
      ${proj.description ? `<p class="rentry-summary">${markersToHtml(proj.description)}</p>` : ""}
      ${techStr ? `<p class="rtech"><strong>Tech:</strong> ${escapeHtml(techStr)}</p>` : ""}
    </div>`;
}

function achievementEntryHtml(a: AchievementEntry): string {
  const name = a.name || a.award_name || "";
  const context = a.context || [a.company, a.year].filter(Boolean).join("  |  ");
  return `
    <div class="rentry">
      <div class="rentry-top"><span class="rentry-title">${escapeHtml(name)}</span>${context ? `<span class="rentry-date">${escapeHtml(context)}</span>` : ""}</div>
      ${a.description ? `<p class="rentry-summary">${markersToHtml(a.description)}</p>` : ""}
    </div>`;
}

function sectionHtml(title: string, bodyHtml: string): string {
  return `<section class="rsection"><h2>${escapeHtml(title)}</h2>${bodyHtml}</section>`;
}

// ─── Full resume HTML + CSS ─────────────────────────────────────────────────

export function buildResumeHtml(r: ResumeData, templateId: number): string {
  const theme = THEMES[templateId] ?? THEMES[1];
  const h: ResumeHeader = r.header ?? r;
  const nameHtml = escapeHtml(h.name || "");

  const sections: string[] = [];

  // Section order MUST match the canonical schema order: header, career_breakdowns,
  // education, certifications, portfolio_projects, leadership_enterpreneurial_experience,
  // technical_skills. Achievements is legacy-only (not part of the current schema) and
  // renders last, only when present in older stored data.
  if (r.summary) sections.push(sectionHtml("Summary", `<p class="rsummary">${markersToHtml(r.summary)}</p>`));
  const jobs = r.career_breakdowns ?? r.experience ?? [];
  if (jobs.length) sections.push(sectionHtml("Work Experience", jobs.map(jobEntryHtml).join("")));
  if (r.education?.length) sections.push(sectionHtml("Education", r.education.map(eduEntryHtml).join("")));
  if (r.certifications?.length) sections.push(sectionHtml("Certifications", r.certifications.map(certEntryHtml).join("")));
  const projects = r.portfolio_projects ?? r.key_projects ?? r.projects ?? [];
  if (projects.length) sections.push(sectionHtml("Portfolio Projects", projects.map(projectEntryHtml).join("")));
  const leadership = r.leadership_enterpreneurial_experience ?? r.leadership ?? [];
  if (leadership.length) sections.push(sectionHtml("Leadership/Entrepreneurial Experience", leadership.map(leadershipEntryHtml).join("")));
  const skillGroups = getSkillGroups(r);
  if (skillGroups.length) {
    const rows = skillGroups.map(
      (row) => `<p class="rskill"><strong>${escapeHtml(row.category)}:</strong> ${escapeHtml(row.values)}</p>`
    ).join("");
    sections.push(sectionHtml("Technical Skills", rows));
  }
  const achievements = r.achievement ?? r.awards ?? [];
  if (achievements.length) sections.push(sectionHtml("Achievements", achievements.map(achievementEntryHtml).join("")));

  const headerHtml = `
    <header class="rhead">
      <div class="rname">${theme.nameCase === "lower" ? nameHtml.toLowerCase() : nameHtml.toUpperCase()}</div>
      ${h.title ? `<div class="rtitle">${escapeHtml(h.title)}</div>` : ""}
      ${contactLineHtml(h)}
    </header>`;

  const css = `
    :root {
      --accent: ${theme.accent}; --dark: ${theme.dark}; --rule: ${theme.rule};
      --body: ${BODY}; --body-muted: ${BODY_MUTED}; --gray: ${GRAY};
      --font-family: ${theme.fontFamily || 'Calibri, Candara, "Segoe UI", Optima, Arial, sans-serif'};
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--font-family);
      color: var(--body);
      font-size: 10.5pt;
      line-height: 1.4;
      margin: 0;
    }
    .resume { max-width: 100%; }
    a { color: var(--accent); text-decoration: none; }
    .rname { font-size: 22pt; font-weight: 700; letter-spacing: 0.5px; }
    .rtitle { font-size: 12pt; color: var(--accent); margin-top: 2px; }
    .rcontact { font-size: 9pt; color: var(--gray); margin-top: 5px; }
    .rcontact .sep { color: var(--rule); }
    h2 {
      font-size: 10.5pt; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--accent); font-weight: 700;
      margin: 16px 0 6px 0; padding-bottom: 3px;
      border-bottom: 0.75pt solid var(--rule);
    }
    .rsection { page-break-inside: auto; }
    .rentry { margin-bottom: 8px; page-break-inside: avoid; }
    .rsummary, .rentry-summary { color: var(--body-muted); margin: 3px 0; }
    .rskill { margin: 2px 0; }
    .rentry-top { display: flex; justify-content: space-between; gap: 8px; font-weight: 700; color: var(--dark); font-size: 10.5pt; }
    .rentry-title { font-weight: 700; }
    .rentry-issuer { font-weight: 400; color: var(--body-muted); }
    .rentry-date { font-weight: 400; color: var(--gray); font-size: 9pt; white-space: nowrap; }
    .rentry-sub { display: flex; justify-content: space-between; gap: 8px; color: var(--body-muted); font-size: 10pt; margin-top: 1px; }
    .rentry-loc { color: var(--gray); font-size: 8.5pt; }
    .rbullets { margin: 4px 0 4px 0; padding-left: 16px; }
    .rbullets li { margin-bottom: 2px; }
    .rtech { font-size: 9pt; margin: 3px 0 0 0; }
    .rtech strong { color: var(--accent); }

    /* Header style variants */
    .header-classic .rhead { border-bottom: 2pt solid var(--accent); padding-bottom: 8px; margin-bottom: 10px; }
    .header-leftbar { border-left: 4pt solid var(--accent); padding-left: 12px; }
    .header-leftbar .rhead { border-bottom: 0.75pt solid var(--rule); padding-bottom: 8px; margin-bottom: 10px; }
    .header-centered .rhead { text-align: center; border-bottom: 1.5pt solid var(--accent); padding-bottom: 8px; margin-bottom: 10px; }
    .header-centered h2 { text-align: center; }
    .header-band .rhead {
      background: var(--dark); color: #fff; margin: 0 0 12px 0;
      padding: 16px 18px; border-radius: 4px;
    }
    .header-band .rtitle { color: #fff; opacity: 0.9; }
    .header-band .rcontact { color: #fff; opacity: 0.85; }
    .header-band .rcontact a { color: #fff; text-decoration: underline; }
    .header-plain-centered .rhead { text-align: center; border-bottom: none; padding-bottom: 4px; margin-bottom: 12px; }
    .header-plain-centered .rname { font-size: 15pt; letter-spacing: 1px; }
    .header-plain-centered .rcontact { color: var(--body); }
    .header-plain-centered .rcontact a { color: var(--body); text-decoration: underline; }

    /* Section header style variants */
    .section-pill h2 { display: inline-block; background: var(--accent); color: #fff; border: none; padding: 3px 10px; border-radius: 10px; }
    .section-square h2 { border-bottom: none; padding-left: 10px; border-left: 3pt solid var(--accent); }
    .section-dashed h2 { border-bottom-style: dashed; }
    .section-dotted h2::before { content: "\\25CF"; color: var(--accent); margin-right: 6px; font-size: 8pt; }
    .section-tripledot h2::after { content: " \\00B7\\00B7\\00B7"; color: var(--rule); letter-spacing: 2px; }
    .section-centered-rule h2 { display: block; }
    .section-underline h2 {
      border-bottom: 0.75pt solid var(--rule);
      color: var(--body); font-size: 11pt; letter-spacing: 0;
    }

    @media print {
      a { color: var(--accent) !important; }
      .header-band .rcontact a { color: #fff !important; }
    }
  `;

  const bodyClasses = [`header-${theme.header}`, `section-${theme.section}`].join(" ");
  return `<style>${css}</style><div class="resume ${bodyClasses}">${headerHtml}${sections.join("")}</div>`;
}

// ─── HTML → PDF via print dialog ────────────────────────────────────────────

function printHtmlAsPDF(html: string, filename: string): void {
  const pdfName = filename.endsWith(".pdf") ? filename : filename + ".pdf";
  const win = window.open("", "_blank");
  if (!win) {
    // Fallback: download as .html file if popup blocked
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfName.replace(/\.pdf$/i, ".html");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>${pdfName}</title>
    <style>
      @media print { @page { margin: 0.5in; size: letter; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
    // Don't close immediately — let user save/cancel the print dialog
  };
}

// ─── Legacy HTML extraction (for raw HTML responses, not JSON) ─────────────

function isLikelyHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function downloadResumePDF(resumeText: string | object, filename: string, templateId = 11): Promise<void> {
  if (!resumeText) {
    console.error("[pdfDownload] resumeText is empty");
    return;
  }

  const r = normalizeResumeData(resumeText);
  if (!r) {
    // Fall back to printing raw HTML directly for legacy HTML responses
    if (typeof resumeText === "string" && isLikelyHtml(resumeText)) {
      printHtmlAsPDF(resumeText.trim(), filename);
      return;
    }
    console.error("[pdfDownload] no valid resume data found", resumeText);
    return;
  }

  const tpl = Math.max(1, Math.min(11, Math.round(templateId)));
  const html = buildResumeHtml(r, tpl);
  printHtmlAsPDF(html, filename);
}
