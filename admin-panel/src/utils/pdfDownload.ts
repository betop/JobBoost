/**
 * Client-side PDF generation for the admin panel.
 * Faithfully mirrors the resume rendering logic from pdfGenerator.js
 * in the Chrome extension. Field names, layout, and rendering match exactly.
 */

import { interRegularBase64, interBoldBase64 } from "./interFontData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

interface ResumeHeader {
  name?: string;
  title?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin?: string | { display: string; url: string };
  github?: string | { display: string; url: string };
}

interface SkillGroup {
  category?: string;
  values?: string | string[];
  skills?: string | string[];
}

interface CareerBreakdown {
  title?: string;
  job_title?: string;
  company?: string;
  date_range?: string;
  start?: string;
  end?: string;
  location?: string;
  company_summary?: string;
  summary?: string;
  highlights?: string[];
  bullets?: string[];
  tech_stack?: string | string[];
  tech?: string | string[];
}

interface EducationEntry {
  degree?: string;
  degree_name?: string;
  institution?: string;
  school?: string;
  year?: string;
  end?: string;
  dates?: string;
}

interface CertEntry {
  name?: string;
  cert_name?: string;
  issuer?: string;
  value_proposition?: string;
  description?: string;
}

interface ProjectEntry {
  name?: string;
  project_name?: string;
  context?: string;
  company?: string;
  year?: string;
  description?: string;
  tech?: string | string[];
  tech_stack?: string | string[];
}

interface AwardEntry {
  name?: string;
  award_name?: string;
  context?: string;
  company?: string;
  year?: string;
  description?: string;
}

interface ResumeData {
  header?: ResumeHeader;
  name?: string;
  title?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin?: string | { display: string; url: string };
  github?: string | { display: string; url: string };
  summary?: string;
  skills?: SkillGroup[];
  career_breakdowns?: CareerBreakdown[];
  experience?: CareerBreakdown[];
  education?: EducationEntry[];
  certifications?: CertEntry[];
  key_projects?: ProjectEntry[];
  projects?: ProjectEntry[];
  awards_recognition?: AwardEntry[];
  awards?: AwardEntry[];
  // top-level envelope fields (legacy)
  resume?: ResumeData;
  cover_letter?: string | object;
}

// ─── JSON extractor (mirrors _extractJSON in pdfGenerator.js) ─────────────────

function extractJSON(raw: string): { resume?: ResumeData } | null {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.replace(/^[ \t]*`{3,}[ \t]*(?:json)?[ \t]*\r?\n?/im, "");
  s = s.replace(/[ \t]*`{3,}[ \t]*$/, "").trim();
  try { return JSON.parse(s); } catch (_) { /* continue */ }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch (_) { /* continue */ }
  }
  try { return JSON.parse(raw.trim()); } catch (_) { /* continue */ }
  return null;
}

// ─── Inline marker parser (mirrors _parseMarkers in pdfGenerator.js) ──────────

function parseMarkers(raw: string): TextSegment[] {
  if (!raw) return [];
  const str = String(raw);
  const isItalic =
    str.startsWith("*") && !str.startsWith("**") &&
    str.endsWith("*")   && !str.endsWith("**");
  const inner = isItalic ? str.slice(1, -1) : str;
  const parts = inner.split(/\*\*(.+?)\*\*/g).filter((p) => p.length > 0);
  return parts.map((part, i) => ({
    text:   part,
    bold:   i % 2 === 1,
    italic: isItalic,
  }));
}

// ─── HTML → PDF via print dialog ──────────────────────────────────────────────

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

// ─── Main export ───────────────────────────────────────────────────────────────

export async function downloadResumePDF(resumeText: string | object, filename: string, templateId = 1): Promise<void> {
  if (!resumeText) {
    console.error("[pdfDownload] resumeText is empty");
    return;
  }

  // If it's already an object, use it directly
  // If it's a string, try to parse it as JSON first; fall back to HTML print
  let r: ResumeData;
  if (typeof resumeText === "object") {
    const obj = resumeText as ResumeData;
    // Unwrap envelope {resume: {...}} if present
    r = (obj as { resume?: ResumeData }).resume ?? obj;
  } else {
    const trimmed = (resumeText as string).trim();
    // Try JSON parse first
    const parsed = extractJSON(trimmed);
    if (parsed) {
      r = (parsed as { resume?: ResumeData }).resume ?? (parsed as ResumeData);
    } else {
      // Fall back to HTML print for legacy HTML responses
      printHtmlAsPDF(trimmed, filename);
      return;
    }
  }

  const { jsPDF } = await import("jspdf");
  const pdfFilename = filename.endsWith(".pdf") ? filename : filename + ".pdf";

  if (!r || (!r.header && !r.name && !r.summary)) {
    console.error("[pdfDownload] no valid resume data found", r);
    return;
  }

  // ── Load Inter font so rendering matches the extension's pdfGenerator.js ─
  let activeFont = "helvetica";
  // Convert base64 to binary string for jsPDF VFS
  const base64ToBinaryStr = (b64: string): string => {
    const bin = atob(b64);
    return bin;
  };
  const interRegVfs  = base64ToBinaryStr(interRegularBase64);
  const interBoldVfs = base64ToBinaryStr(interBoldBase64);
  activeFont = "Inter"; // will be confirmed after doc creation

  // ── Page geometry (US Letter in mm) ───────────────────────────────────────
  const PW = 215.9;
  const PH = 279.4;
  const MT = 14;
  const MB = 14;
  let MH = 18;
  let CW = PW - MH * 2;

  type RGB = [number, number, number];

  // Theme colors keyed by template id — mirrors _applyTemplateTheme in pdfGenerator.js
  const THEMES: Record<number, { accent: RGB; dark: RGB; medium: RGB; gray: RGB; rule: RGB }> = {
    1:  { accent: [37,  99,  235], dark: [17,  24,  39],  medium: [55,  65,  81],  gray: [107,114,128], rule: [209,213,219] },
    2:  { accent: [5,   150, 105], dark: [6,   78,  59],  medium: [52,  211,153],  gray: [107,114,128], rule: [167,243,208] },
    3:  { accent: [124, 58,  237], dark: [46,  16,  101], medium: [109, 40,  217], gray: [156,163,175], rule: [221,214,254] },
    4:  { accent: [220, 38,  38],  dark: [127, 29,  29],  medium: [185, 28,  28],  gray: [156,163,175], rule: [254,202,202] },
    5:  { accent: [2,   132, 199], dark: [12,  74,  110], medium: [3,   105,161],  gray: [148,163,184], rule: [186,230,253] },
    6:  { accent: [180, 83,  9],   dark: [120, 53,  15],  medium: [217, 119, 6],   gray: [156,163,175], rule: [253,230,138] },
    7:  { accent: [15,  118, 110], dark: [19,  78,  74],  medium: [13,  148,136],  gray: [148,163,184], rule: [153,246,228] },
    8:  { accent: [79,  70,  229], dark: [30,  27,  75],  medium: [67,  56,  202], gray: [148,163,184], rule: [199,210,254] },
    9:  { accent: [236, 72,  153], dark: [131, 24,  67],  medium: [219, 39,  119], gray: [156,163,175], rule: [251,207,232] },
    10: { accent: [100, 116, 139], dark: [15,  23,  42],  medium: [71,  85,  105], gray: [148,163,184], rule: [203,213,225] },
  };
  const theme = THEMES[templateId] ?? THEMES[1];

  const C: Record<string, RGB> = {
    accent: theme.accent,
    dark:   theme.dark,
    medium: theme.medium,
    // body/bodyMuted/gray are FIXED near-black values across all themes
    // (matches _applyTemplateTheme in pdfGenerator.js which always overrides these)
    body:      [24, 24, 27],
    bodyMuted: [63, 63, 70],
    gray:      [82, 82, 91],
    rule:   theme.rule,
  };

  const SP = {
    beforeSection:  8.0,
    afterRule:      4.5,
    betweenJobs:    3.7,
    betweenEdu:     2.1,
    betweenCert:    2.1,
    betweenProject: 2.6,
    betweenAward:   2.1,
    betweenBullets: 0.8,
    afterBullets:   2.1,
    skillsRow:      0.8,
    companySumTop:  1.1,
    companySumBot:  1.6,
    techStackTop:   2.1,
  };
  const LH = { base: 4.5, sm: 4.1 };

  const doc = new jsPDF({ unit: "mm", format: [PW, PH] });

  // Register Inter font if it was loaded successfully
  if (activeFont === "Inter") {
    try {
      doc.addFileToVFS("Inter-Regular.ttf", interRegVfs);
      doc.addFont("Inter-Regular.ttf", "Inter", "normal");
      doc.addFileToVFS("Inter-Bold.ttf", interBoldVfs);
      doc.addFont("Inter-Bold.ttf", "Inter", "bold");
      // Verify the font actually works
      doc.setFont("Inter", "normal");
      doc.getTextWidth("test");
      doc.setFont("Inter", "bold");
      doc.getTextWidth("test");
    } catch (e) {
      console.warn("[pdfDownload] Inter font registration failed, using helvetica", e);
      activeFont = "helvetica";
    }
  }

  let y = MT;

  const checkBreak = (need = 20) => {
    if (y > PH - MB - need) { doc.addPage(); y = MT; }
  };

  const sectionHeader = (title: string) => {
    y += SP.beforeSection;
    checkBreak(14);
    doc.setFont(activeFont, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.accent);
    doc.text(title.toUpperCase(), MH, y);
    y += 1.5;
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.265);
    doc.line(MH, y, PW - MH, y);
    y += SP.afterRule;
  };

  // Word-by-word mixed segment renderer (mirrors _renderSegments)
  const renderSegments = (
    segs: TextSegment[], x: number, startY: number,
    maxW: number, ptSize: number, color: RGB, lineH: number
  ): number => {
    if (!segs.length) return startY;
    let cx = x, cy = startY;
    segs.forEach(({ text, bold }) => {
      doc.setFont(activeFont, bold ? "bold" : "normal");
      doc.setFontSize(ptSize);
      doc.setTextColor(...color);
      text.split(/(\s+)/).forEach((word) => {
        if (!word) return;
        if (/^\s+$/.test(word)) { cx += doc.getTextWidth(" "); return; }
        const ww = doc.getTextWidth(word);
        if (cx > x && cx + ww > x + maxW) { cy += lineH; cx = x; }
        doc.text(word, cx, cy);
        cx += ww;
      });
    });
    return cy;
  };

  // Skills row — label: values (mirrors _renderSkillsRow)
  const renderSkillsRow = (category: string, values: string) => {
    checkBreak(10);
    const labelText = (category || "") + ":";
    doc.setFont(activeFont, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.body);
    doc.text(labelText, MH, y);
    const labelW = doc.getTextWidth(labelText) + 2;
    doc.setFont(activeFont, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.body);

    const words = values.split(" ");
    let lineX = MH + labelW, lineMaxW = CW - labelW;
    let currentLine = "", lineY = y, extraLines = 0;
    words.forEach((word) => {
      const test = currentLine ? currentLine + " " + word : word;
      if (doc.getTextWidth(test) > lineMaxW && currentLine) {
        doc.text(currentLine, lineX, lineY);
        lineY += LH.sm; lineX = MH; lineMaxW = CW;
        currentLine = word; extraLines++;
      } else { currentLine = test; }
    });
    if (currentLine) doc.text(currentLine, lineX, lineY);
    y += extraLines * LH.sm + LH.base + SP.skillsRow;
  };

  // ── Header data (handle both {header:{...}} and flat schema) ────────────────
  const h: ResumeHeader = r.header ?? r;

  // ── Contact line helper ───────────────────────────────────────────────────
  const renderContactLine = (ptSize = 9, centered = false, opts?: { textColor?: RGB; linkColor?: RGB }) => {
    const textColor = opts?.textColor ?? C.gray;
    const linkColor = opts?.linkColor ?? C.accent;
    const parts: { text: string; url: string | null }[] = [];
    if (h.location) parts.push({ text: h.location, url: null });
    if (h.email)    parts.push({ text: h.email, url: `mailto:${h.email}` });
    if (h.phone)    parts.push({ text: h.phone, url: null });
    if (h.linkedin) {
      const li = typeof h.linkedin === "object" ? h.linkedin : { display: String(h.linkedin), url: String(h.linkedin) };
      if (li.display) parts.push({ text: li.display, url: li.url });
    }
    if (h.github) {
      const gh = typeof h.github === "object" ? h.github : { display: String(h.github), url: String(h.github) };
      if (gh.display) parts.push({ text: gh.display, url: gh.url });
    }
    if (!parts.length) return;
    doc.setFont(activeFont, "normal");
    doc.setFontSize(ptSize);
    doc.setTextColor(...textColor);
    const sep = " \u00B7 ";
    const totalW = parts.reduce((acc, p, i) => acc + doc.getTextWidth(p.text) + (i > 0 ? doc.getTextWidth(sep) : 0), 0);
    let cx = centered ? (PW - totalW) / 2 : MH;
    parts.forEach((part, i) => {
      if (i > 0) { doc.text(sep, cx, y); cx += doc.getTextWidth(sep); }
      if (part.url) {
        doc.setTextColor(...linkColor);
        doc.textWithLink(part.text, cx, y, { url: part.url });
        doc.setTextColor(...textColor);
      } else {
        doc.text(part.text, cx, y);
      }
      cx += doc.getTextWidth(part.text);
    });
    y += 5;
  };

  // ── Entry renderers (shared across all templates) ─────────────────────────

  const renderCareerEntry = (job: CareerBreakdown) => {
    checkBreak(40);
    const dateStr = job.date_range || [job.start, job.end || "Present"].filter(Boolean).join(" – ");
    doc.setFont(activeFont, "bold"); doc.setFontSize(10.5); doc.setTextColor(...C.dark);
    doc.text(job.title || job.job_title || "", MH, y);
    doc.setFont(activeFont, "normal"); doc.setFontSize(9); doc.setTextColor(...C.gray);
    doc.text(dateStr, PW - MH - doc.getTextWidth(dateStr), y);
    y += LH.base + 0.5;

    const displayText = (job as any).promotion_note || job.location || "";
    doc.setFont(activeFont, "normal"); doc.setFontSize(10); doc.setTextColor(...C.bodyMuted);
    doc.text(job.company || "", MH, y);
    if (displayText) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(8); doc.setTextColor(...C.gray);
      doc.text(displayText, PW - MH - doc.getTextWidth(displayText), y);
    }
    y += LH.base + 0.5;

    const summary = job.company_summary || job.summary || "";
    if (summary) {
      y += SP.companySumTop;
      const endY = renderSegments(parseMarkers(summary), MH, y, CW, 9.5, C.bodyMuted, LH.sm);
      y = endY + LH.sm + SP.companySumBot;
    }

    const bullets = job.highlights ?? job.bullets ?? [];
    bullets.forEach((bullet, bi) => {
      const bx = MH + 3.5, bw = CW - 3.5;
      doc.setFont(activeFont, "normal"); doc.setFontSize(10);
      const bLines = doc.splitTextToSize(String(bullet || "").replace(/\*\*/g, ""), bw);
      checkBreak(bLines.length * LH.base + SP.betweenBullets + 2);
      doc.setTextColor(...C.body);
      doc.text("\u2022", MH, y);
      const endY = renderSegments(parseMarkers(bullet), bx, y, bw, 10, C.body, LH.base);
      y = endY + LH.base + SP.betweenBullets;
      if (bi === bullets.length - 1) y += SP.afterBullets - SP.betweenBullets;
    });

    const tech = job.tech_stack ?? job.tech;
    if (tech && (Array.isArray(tech) ? tech.length : tech)) {
      y += SP.techStackTop; checkBreak(8);
      doc.setFont(activeFont, "normal"); doc.setFontSize(9.5); doc.setTextColor(...C.accent);
      const label = "Tech Stack:  "; doc.text(label, MH, y);
      const lw = doc.getTextWidth(label);
      doc.setFont(activeFont, "normal"); doc.setFontSize(9.5); doc.setTextColor(...C.gray);
      const techStr = Array.isArray(tech) ? tech.join(", ") : String(tech);
      const tlines = doc.splitTextToSize(techStr, CW - lw);
      doc.text(tlines, MH + lw, y);
      y += (tlines.length - 1) * LH.sm + LH.sm;
    }
  };

  const renderEducationEntry = (edu: EducationEntry) => {
    checkBreak(14);
    const year = edu.year || edu.end || (edu as any).dates || "";
    doc.setFont(activeFont, "bold"); doc.setFontSize(10); doc.setTextColor(...C.body);
    doc.text(edu.degree || edu.degree_name || "", MH, y);
    doc.setFont(activeFont, "normal"); doc.setFontSize(9.5); doc.setTextColor(...C.gray);
    doc.text(year, PW - MH - doc.getTextWidth(year), y);
    y += LH.base + 0.5;
    const inst = edu.institution || edu.school || "";
    if (inst) {
      doc.setFont(activeFont, "bold"); doc.setFontSize(9.5); doc.setTextColor(...C.bodyMuted);
      doc.text(inst, MH, y); y += LH.sm + 0.5;
    }
  };

  const renderCertEntry = (cert: CertEntry) => {
    checkBreak(14);
    const name = cert.name || cert.cert_name || "";
    doc.setFont(activeFont, "bold"); doc.setFontSize(10); doc.setTextColor(...C.body);
    doc.text(name, MH, y);
    if (cert.issuer) {
      const sep = "  \u00B7  ";
      doc.setFont(activeFont, "normal"); doc.setFontSize(9.5); doc.setTextColor(...C.bodyMuted);
      doc.text(sep + cert.issuer, MH + doc.getTextWidth(name), y);
    }
    y += LH.base + 0.5;
    const vp = cert.value_proposition || cert.description || "";
    if (vp) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(9.5); doc.setTextColor(...C.bodyMuted);
      const lines = doc.splitTextToSize(vp, CW);
      doc.text(lines, MH, y);
      y += (lines.length - 1) * LH.sm + LH.sm + 0.5;
    }
  };

  const renderProjectEntry = (proj: ProjectEntry) => {
    checkBreak(18);
    const name = proj.name || proj.project_name || "";
    const context = (proj as any).context || [proj.company, proj.year].filter(Boolean).join("  |  ");
    doc.setFont(activeFont, "bold"); doc.setFontSize(10.5); doc.setTextColor(...C.dark);
    doc.text(name, MH, y);
    if (context) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(9); doc.setTextColor(...C.gray);
      doc.text(context, PW - MH - doc.getTextWidth(context), y);
    }
    y += LH.base + 0.5;
    if (proj.description) {
      const endY = renderSegments(parseMarkers(proj.description), MH, y, CW, 10, C.body, LH.base);
      y = endY + LH.base + 0.8;
    }
    const tech = proj.tech ?? proj.tech_stack;
    if (tech && (Array.isArray(tech) ? tech.length : tech)) {
      y += SP.techStackTop - 1;
      doc.setFont(activeFont, "normal"); doc.setFontSize(9.5); doc.setTextColor(...C.accent);
      const label = "Tech:  "; doc.text(label, MH, y);
      const lw = doc.getTextWidth(label);
      doc.setFont(activeFont, "normal"); doc.setFontSize(9.5); doc.setTextColor(...C.gray);
      const techStr = Array.isArray(tech) ? tech.join(", ") : String(tech);
      const tlines = doc.splitTextToSize(techStr, CW - lw);
      doc.text(tlines, MH + lw, y);
      y += (tlines.length - 1) * LH.sm + LH.sm;
    }
  };

  const renderAwardEntry = (award: AwardEntry) => {
    checkBreak(14);
    const name = award.name || award.award_name || "";
    const context = (award as any).context || [award.company, award.year].filter(Boolean).join("  |  ");
    doc.setFont(activeFont, "bold"); doc.setFontSize(10.5); doc.setTextColor(...C.dark);
    doc.text(name, MH, y);
    if (context) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(9); doc.setTextColor(...C.gray);
      doc.text(context, PW - MH - doc.getTextWidth(context), y);
    }
    y += LH.base + 0.5;
    if (award.description) {
      const endY = renderSegments(parseMarkers(award.description), MH, y, CW, 10, C.body, LH.base);
      y = endY + LH.base + 0.5;
    }
  };

  // ── Shared sections renderer ──────────────────────────────────────────────
  // Uses current values of MH / CW (can be overridden by template 8 sidebar)
  const renderCommonSections = (sectionHeaderFn: (title: string) => void, skipSummary = false) => {
    if (!skipSummary && r.summary) {
      sectionHeaderFn("SUMMARY");
      const endY = renderSegments(parseMarkers(r.summary), MH, y, CW, 10, C.body, LH.base);
      y = endY + LH.base + 1;
    }
    if (r.skills?.length) {
      sectionHeaderFn("SKILLS");
      r.skills.forEach((row) => {
        const v = row.values ?? row.skills ?? "";
        renderSkillsRow(row.category || "", Array.isArray(v) ? v.join(", ") : String(v));
      });
      y += 1;
    }
    const jobs = r.career_breakdowns ?? r.experience ?? [];
    if (jobs.length) {
      sectionHeaderFn("EXPERIENCE");
      jobs.forEach((job, idx) => { renderCareerEntry(job); if (idx < jobs.length - 1) y += SP.betweenJobs; });
    }
    if (r.education?.length) {
      sectionHeaderFn("EDUCATION");
      r.education.forEach((edu, idx) => { renderEducationEntry(edu); if (idx < r.education!.length - 1) y += SP.betweenEdu; });
    }
    if (r.certifications?.length) {
      sectionHeaderFn("CERTIFICATIONS");
      r.certifications.forEach((cert, idx) => { renderCertEntry(cert); if (idx < r.certifications!.length - 1) y += SP.betweenCert; });
    }
    const projects = r.key_projects ?? r.projects ?? [];
    if (projects.length) {
      sectionHeaderFn("KEY PROJECTS");
      projects.forEach((proj, idx) => { renderProjectEntry(proj); if (idx < projects.length - 1) y += SP.betweenProject; });
    }
    const awards = r.awards_recognition ?? r.awards ?? [];
    if (awards.length) {
      sectionHeaderFn("AWARDS & RECOGNITION");
      awards.forEach((award, idx) => { renderAwardEntry(award); if (idx < awards.length - 1) y += SP.betweenAward; });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  Per-template render functions
  // ═══════════════════════════════════════════════════════════════════════════

  // Template 1 — Classic Blue
  const renderTemplate1 = () => {
    doc.setFont(activeFont, "bold"); doc.setFontSize(22); doc.setTextColor(...C.body);
    doc.text((h.name || "").toUpperCase(), MH, y); y += 7.5;
    if (h.title) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(11); doc.setTextColor(...C.accent);
      doc.text(h.title, MH, y); y += 5.5;
    }
    renderContactLine(9);
    y += 1.5;
    doc.setDrawColor(...C.accent); doc.setLineWidth(0.53);
    doc.line(MH, y, PW - MH, y); y += 3;
    renderCommonSections(sectionHeader);
  };

  // Template 2 — Emerald Modern (pill section badges, thick bottom border)
  const renderTemplate2 = () => {
    doc.setFont(activeFont, "bold"); doc.setFontSize(26); doc.setTextColor(...C.accent);
    doc.text((h.name || "").toUpperCase(), MH, y); y += 9;
    if (h.title) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(12); doc.setTextColor(...C.dark);
      doc.text(h.title, MH, y); y += 6;
    }
    renderContactLine(9);
    y += 2;
    doc.setDrawColor(...C.accent); doc.setLineWidth(1.2);
    doc.line(MH, y, PW - MH, y); y += 6;
    renderCommonSections((title) => {
      y += SP.beforeSection; checkBreak(14);
      doc.setFillColor(...C.accent);
      doc.roundedRect(MH, y - 3.5, doc.getTextWidth(title.toUpperCase()) + 5, 5.5, 1.5, 1.5, "F");
      doc.setFont(activeFont, "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
      doc.text(title.toUpperCase(), MH + 2.5, y);
      y += SP.afterRule + 1;
    });
  };

  // Template 3 — Royal Purple (centered name, double rule)
  const renderTemplate3 = () => {
    doc.setFont(activeFont, "bold"); doc.setFontSize(24); doc.setTextColor(...C.dark);
    const nameW = doc.getTextWidth((h.name || "").toUpperCase());
    doc.text((h.name || "").toUpperCase(), (PW - nameW) / 2, y); y += 8;
    if (h.title) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(11); doc.setTextColor(...C.accent);
      const tW = doc.getTextWidth(h.title);
      doc.text(h.title, (PW - tW) / 2, y); y += 5.5;
    }
    renderContactLine(9, true);
    y += 2;
    doc.setDrawColor(...C.accent); doc.setLineWidth(0.8);
    doc.line(MH, y, PW - MH, y); y += 1.5;
    doc.setLineWidth(0.25);
    doc.line(MH, y, PW - MH, y); y += 6;
    renderCommonSections((title) => {
      y += SP.beforeSection; checkBreak(14);
      doc.setFont(activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...C.accent);
      const tw = doc.getTextWidth(title.toUpperCase());
      doc.text(title.toUpperCase(), (PW - tw) / 2, y);
      y += 1.8;
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.265);
      doc.line(MH, y, PW - MH, y); y += SP.afterRule;
    });
  };

  // Template 4 — Bold Red (left bar accent on name)
  const renderTemplate4 = () => {
    doc.setFillColor(...C.accent);
    doc.rect(0, 0, 4, PH, "F");
    doc.setFont(activeFont, "bold"); doc.setFontSize(24); doc.setTextColor(...C.dark);
    doc.text((h.name || "").toUpperCase(), MH, y); y += 8.5;
    if (h.title) {
      doc.setFont(activeFont, "bold"); doc.setFontSize(11); doc.setTextColor(...C.accent);
      doc.text(h.title, MH, y); y += 6;
    }
    renderContactLine(9);
    y += 2;
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.4);
    doc.line(MH, y, PW - MH, y); y += 6;
    renderCommonSections((title) => {
      y += SP.beforeSection; checkBreak(14);
      doc.setFillColor(...C.accent);
      doc.rect(MH, y - 3.5, 2, 5.5, "F");
      doc.setFont(activeFont, "bold"); doc.setFontSize(9.5); doc.setTextColor(...C.dark);
      doc.text(title.toUpperCase(), MH + 4, y);
      y += 2;
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.265);
      doc.line(MH, y, PW - MH, y); y += SP.afterRule;
    });
  };

  // Template 5 — Sky Blue (name on coloured header band)
  const renderTemplate5 = () => {
    const bandH = 36;
    doc.setFillColor(...C.dark);
    doc.rect(0, 0, PW, bandH, "F");
    doc.setFont(activeFont, "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text((h.name || "").toUpperCase(), MH, 14);
    if (h.title) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(10.5); doc.setTextColor(255, 255, 255);
      doc.text(h.title, MH, 22);
    }
    y = 30;
    renderContactLine(8.5, false, { textColor: [255, 255, 255], linkColor: [255, 255, 255] });
    y = bandH + 10;
    renderCommonSections((title) => {
      y += SP.beforeSection; checkBreak(14);
      doc.setFont(activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...C.accent);
      doc.text(title.toUpperCase(), MH, y);
      y += 1.8;
      doc.setDrawColor(...C.accent); doc.setLineWidth(0.5);
      doc.line(MH, y, PW - MH, y); y += SP.afterRule;
    });
  };

  // Template 6 — Amber / Warm (dash-rule)
  const renderTemplate6 = () => {
    doc.setFont(activeFont, "bold"); doc.setFontSize(24); doc.setTextColor(...C.dark);
    doc.text((h.name || "").toUpperCase(), MH, y); y += 8;
    if (h.title) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(11); doc.setTextColor(...C.accent);
      doc.text(h.title, MH, y); y += 5.5;
    }
    renderContactLine(9);
    y += 2;
    doc.setDrawColor(...C.accent); doc.setLineWidth(0.6);
    (doc as any).setLineDashPattern([2, 1.5], 0);
    doc.line(MH, y, PW - MH, y);
    (doc as any).setLineDashPattern([], 0);
    y += 6;
    renderCommonSections((title) => {
      y += SP.beforeSection; checkBreak(14);
      doc.setFont(activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...C.accent);
      doc.text(title.toUpperCase(), MH, y);
      y += 2;
      doc.setDrawColor(...C.accent); doc.setLineWidth(0.8);
      doc.line(MH, y, MH + 18, y);
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.265);
      doc.line(MH + 19, y, PW - MH, y); y += SP.afterRule;
    });
  };

  // Template 7 — Teal Minimal (lowercase name, thin rules)
  const renderTemplate7 = () => {
    doc.setFont(activeFont, "bold"); doc.setFontSize(28); doc.setTextColor(...C.accent);
    doc.text((h.name || "").toLowerCase(), MH, y); y += 9;
    if (h.title) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(10); doc.setTextColor(...C.dark);
      doc.text(h.title, MH, y); y += 5.5;
    }
    renderContactLine(8.5);
    y += 3;
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.2);
    doc.line(MH, y, PW - MH, y); y += 6;
    renderCommonSections((title) => {
      y += SP.beforeSection; checkBreak(14);
      doc.setFillColor(...C.accent);
      doc.circle(MH + 1, y - 1, 1.2, "F");
      doc.setFont(activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...C.dark);
      doc.text(title.toUpperCase(), MH + 4, y);
      y += 2;
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.2);
      doc.line(MH, y, PW - MH, y); y += SP.afterRule;
    });
  };

  // Template 8 — Indigo Sidebar (dark left sidebar with name + contact)
  const renderTemplate8 = () => {
    const sideW = 58;
    const contentX = sideW + 8;
    const contentW = PW - contentX - 12;

    // Sidebar background
    doc.setFillColor(...C.dark);
    doc.rect(0, 0, sideW, PH, "F");

    // Sidebar: name
    doc.setFont(activeFont, "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
    const nameLines: string[] = doc.splitTextToSize((h.name || "").toUpperCase(), sideW - 12);
    let sy = 14;
    nameLines.forEach((ln) => { doc.text(ln, 7, sy); sy += 5.5; });
    sy += 2;
    if (h.title) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      const tLines: string[] = doc.splitTextToSize(h.title, sideW - 12);
      tLines.forEach((ln) => { doc.text(ln, 7, sy); sy += 4.5; });
      sy += 3;
    }
    doc.setDrawColor(...C.accent); doc.setLineWidth(0.5);
    doc.line(7, sy, sideW - 7, sy); sy += 5;

    // Sidebar contact items
    doc.setFont(activeFont, "normal"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    const sideItems: string[] = [];
    if (h.email) sideItems.push(h.email);
    if (h.phone) sideItems.push(h.phone);
    if (h.location) sideItems.push(h.location);
    if (h.linkedin) sideItems.push(typeof h.linkedin === "object" ? h.linkedin.display : String(h.linkedin));
    sideItems.forEach((item) => {
      const ls: string[] = doc.splitTextToSize(item, sideW - 12);
      ls.forEach((l) => { doc.text(l, 7, sy); sy += 4; });
      sy += 1;
    });

    // Override margins to render content in the right panel
    MH = contentX;
    CW = contentW;
    y = 14;

    const t8SectionHeader = (title: string) => {
      y += SP.beforeSection; checkBreak(14);
      doc.setFont(activeFont, "bold"); doc.setFontSize(8.5); doc.setTextColor(...C.accent);
      doc.text(title.toUpperCase(), MH, y);
      y += 1.8;
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.265);
      doc.line(MH, y, PW - 12, y); y += SP.afterRule;
    };

    // Render PROFILE (summary) manually with alternate title
    if (r.summary) {
      t8SectionHeader("PROFILE");
      const endY = renderSegments(parseMarkers(r.summary), MH, y, CW, 10, C.body, LH.base);
      y = endY + LH.base + 1;
    }
    // Render remaining sections (skip summary since it was done above)
    renderCommonSections(t8SectionHeader, true /* skipSummary */);

    // Restore margins
    MH = 18;
    CW = PW - MH * 2;
  };

  // Template 9 — Rose / Bold Pink (name in white on accent header)
  const renderTemplate9 = () => {
    const hh = h.title ? 30 : 24;
    doc.setFillColor(...C.accent);
    doc.rect(0, 0, PW, hh, "F");
    doc.setFont(activeFont, "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text((h.name || "").toUpperCase(), MH, 13);
    if (h.title) {
      doc.setFont(activeFont, "normal"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text(h.title, MH, 21);
    }
    y = hh + 6;
    renderContactLine(8.5);
    y += 2;
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.25);
    doc.line(MH, y, PW - MH, y); y += 5;
    renderCommonSections((title) => {
      y += SP.beforeSection; checkBreak(14);
      doc.setFont(activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...C.accent);
      doc.text(title.toUpperCase(), MH, y);
      y += 2;
      doc.setDrawColor(...C.accent); doc.setLineWidth(0.4);
      doc.line(MH, y, PW - MH, y); y += SP.afterRule;
    });
  };

  // Template 10 — Slate Professional (triple dot separator)
  const renderTemplate10 = () => {
    doc.setFont(activeFont, "bold"); doc.setFontSize(26); doc.setTextColor(...C.dark);
    doc.text((h.name || "").toUpperCase(), MH, y); y += 8.5;
    if (h.title) {
      doc.setFillColor(...C.accent);
      doc.circle(MH + 1, y - 1.2, 1.0, "F");
      doc.setFont(activeFont, "normal"); doc.setFontSize(11); doc.setTextColor(...C.medium);
      doc.text(h.title, MH + 4, y); y += 6;
    }
    renderContactLine(9);
    y += 2;
    doc.setFillColor(...C.accent);
    doc.circle(MH, y, 1, "F");
    doc.circle(MH + 4, y, 1, "F");
    doc.circle(MH + 8, y, 1, "F");
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.265);
    doc.line(MH + 12, y, PW - MH, y); y += 6;
    renderCommonSections((title) => {
      y += SP.beforeSection; checkBreak(14);
      doc.setFont(activeFont, "bold"); doc.setFontSize(9); doc.setTextColor(...C.accent);
      doc.text(title.toUpperCase(), MH, y);
      y += 1.8;
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.265);
      doc.line(MH, y, PW - MH, y); y += SP.afterRule;
    });
  };

  // ── Dispatch ──────────────────────────────────────────────────────────────
  switch (Math.max(1, Math.min(10, Math.round(templateId)))) {
    case 2:  renderTemplate2();  break;
    case 3:  renderTemplate3();  break;
    case 4:  renderTemplate4();  break;
    case 5:  renderTemplate5();  break;
    case 6:  renderTemplate6();  break;
    case 7:  renderTemplate7();  break;
    case 8:  renderTemplate8();  break;
    case 9:  renderTemplate9();  break;
    case 10: renderTemplate10(); break;
    default: renderTemplate1();  break;
  }

  // ── Download ───────────────────────────────────────────────────────────────
  doc.save(pdfFilename);
}
