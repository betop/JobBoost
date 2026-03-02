/**
 * Client-side PDF generation for the admin panel.
 * Faithfully mirrors the resume rendering logic from pdfGenerator.js
 * in the Chrome extension. Field names, layout, and rendering match exactly.
 */

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

export async function downloadResumePDF(resumeText: string | object, filename: string): Promise<void> {
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

  // ── Page geometry (US Letter in mm) ───────────────────────────────────────
  const PW = 215.9;
  const PH = 279.4;
  const MT = 14;
  const MB = 14;
  const MH = 18;
  const CW = PW - MH * 2;

  type RGB = [number, number, number];
  const C: Record<string, RGB> = {
    accent: [37,  99,  235],
    dark:   [17,  24,  39 ],
    medium: [55,  65,  81 ],
    gray:   [107, 114, 128],
    rule:   [209, 213, 219],
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
  let y = MT;

  const checkBreak = (need = 20) => {
    if (y > PH - MB - need) { doc.addPage(); y = MT; }
  };

  const sectionHeader = (title: string) => {
    y += SP.beforeSection;
    checkBreak(14);
    doc.setFont("helvetica", "bold");
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
      doc.setFont("helvetica", bold ? "bold" : "normal");
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.dark);
    doc.text(labelText, MH, y);
    const labelW = doc.getTextWidth(labelText) + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.dark);

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

  // ── Header ─────────────────────────────────────────────────────────────────
  // New schema: header is always a sub-object; legacy: flat fields at root
  const h: ResumeHeader = r.header ?? r;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.dark);
  doc.text((h.name || "").toUpperCase(), MH, y);
  y += 7.5;

  if (h.title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.accent);
    doc.text(h.title, MH, y);
    y += 5.5;
  }

  const contactParts: { text: string; url: string | null }[] = [];
  if (h.location) contactParts.push({ text: h.location, url: null });
  if (h.email)    contactParts.push({ text: h.email, url: `mailto:${h.email}` });
  if (h.phone)    contactParts.push({ text: h.phone, url: null });
  if (h.linkedin) {
    const li = typeof h.linkedin === "object" ? h.linkedin : { display: String(h.linkedin), url: String(h.linkedin) };
    if (li.display) contactParts.push({ text: li.display, url: li.url });
  }
  if (h.github) {
    const gh = typeof h.github === "object" ? h.github : { display: String(h.github), url: String(h.github) };
    if (gh.display) contactParts.push({ text: gh.display, url: gh.url });
  }

  if (contactParts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.gray);
    const sep = " \u00B7 ";
    let cx = MH;
    contactParts.forEach((part, i) => {
      if (i > 0) { doc.text(sep, cx, y); cx += doc.getTextWidth(sep); }
      if (part.url) {
        doc.setTextColor(...C.accent);
        doc.textWithLink(part.text, cx, y, { url: part.url });
        doc.setTextColor(...C.gray);
      } else { doc.text(part.text, cx, y); }
      cx += doc.getTextWidth(part.text);
    });
    y += 5;
  }

  y += 1.5;
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.53);
  doc.line(MH, y, PW - MH, y);
  y += 3;

  // ── Summary ────────────────────────────────────────────────────────────────
  if (r.summary) {
    sectionHeader("SUMMARY");
    const endY = renderSegments(parseMarkers(r.summary), MH, y, CW, 10, C.dark, LH.base);
    y = endY + LH.base + 1;
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  if (r.skills && r.skills.length) {
    sectionHeader("SKILLS");
    r.skills.forEach((row) => {
      const v = row.values ?? row.skills ?? "";
      renderSkillsRow(row.category || "", Array.isArray(v) ? v.join(", ") : String(v));
    });
    y += 1;
  }

  // ── Experience ─────────────────────────────────────────────────────────────
  const jobs = r.career_breakdowns ?? r.experience ?? [];
  if (jobs.length) {
    sectionHeader("EXPERIENCE");
    jobs.forEach((job, idx) => {
      checkBreak(40);
      const dateStr = job.date_range || [job.start, job.end || "Present"].filter(Boolean).join(" – ");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...C.dark);
      doc.text(job.title || job.job_title || "", MH, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.gray);
      doc.text(dateStr, PW - MH - doc.getTextWidth(dateStr), y);
      y += LH.base + 0.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...C.medium);
      doc.text(job.company || "", MH, y);
      if (job.location) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...C.gray);
        doc.text(job.location, PW - MH - doc.getTextWidth(job.location), y);
      }
      y += LH.base + 0.5;

      const summary = job.company_summary || job.summary || "";
      if (summary) {
        y += SP.companySumTop;
        const endY = renderSegments(parseMarkers(summary), MH, y, CW, 9.5, C.gray, LH.sm);
        y = endY + LH.sm + SP.companySumBot;
      }

      const bullets = job.highlights ?? job.bullets ?? [];
      bullets.forEach((bullet, bi) => {
        const bx = MH + 3.5, bw = CW - 3.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const bLines = doc.splitTextToSize(String(bullet || "").replace(/\*\*/g, ""), bw);
        checkBreak(bLines.length * LH.base + SP.betweenBullets + 2);
        doc.setTextColor(...C.dark);
        doc.text("\u2022", MH, y);
        const endY = renderSegments(parseMarkers(bullet), bx, y, bw, 10, C.dark, LH.base);
        y = endY + LH.base + SP.betweenBullets;
        if (bi === bullets.length - 1) y += SP.afterBullets - SP.betweenBullets;
      });

      const tech = job.tech_stack ?? job.tech;
      if (tech && (Array.isArray(tech) ? tech.length : tech)) {
        y += SP.techStackTop;
        checkBreak(8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...C.accent);
        const label = "Tech Stack:  ";
        doc.text(label, MH, y);
        const lw = doc.getTextWidth(label);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...C.gray);
        const techStr = Array.isArray(tech) ? tech.join(", ") : String(tech);
        const tlines = doc.splitTextToSize(techStr, CW - lw);
        doc.text(tlines, MH + lw, y);
        y += (tlines.length - 1) * LH.sm + LH.sm;
      }

      if (idx < jobs.length - 1) y += SP.betweenJobs;
    });
  }

  // ── Education ──────────────────────────────────────────────────────────────
  if (r.education && r.education.length) {
    sectionHeader("Education");
    r.education.forEach((edu, idx) => {
      checkBreak(14);
      const year = edu.year || edu.end || edu.dates || "";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...C.medium);
      doc.text(edu.degree || edu.degree_name || "", MH, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...C.gray);
      doc.text(year, PW - MH - doc.getTextWidth(year), y);
      y += LH.base + 0.5;

      const inst = edu.institution || edu.school || "";
      if (inst) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...C.gray);
        doc.text(inst, MH, y);
        y += LH.sm + 0.5;
      }
      if (idx < r.education!.length - 1) y += SP.betweenEdu;
    });
  }

  // ── Certifications ─────────────────────────────────────────────────────────
  if (r.certifications && r.certifications.length) {
    sectionHeader("CERTIFICATIONS");
    r.certifications.forEach((cert, idx) => {
      checkBreak(14);
      const name = cert.name || cert.cert_name || "";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...C.medium);
      doc.text(name, MH, y);
      if (cert.issuer) {
        const sep = "  \u00B7  ";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...C.gray);
        doc.text(sep + cert.issuer, MH + doc.getTextWidth(name), y);
      }
      y += LH.base + 0.5;

      const vp = cert.value_proposition || cert.description || "";
      if (vp) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...C.gray);
        const lines = doc.splitTextToSize(vp, CW);
        doc.text(lines, MH, y);
        y += (lines.length - 1) * LH.sm + LH.sm + 0.5;
      }
      if (idx < r.certifications!.length - 1) y += SP.betweenCert;
    });
  }

  // ── Key Projects ───────────────────────────────────────────────────────────
  const projects = r.key_projects ?? r.projects ?? [];
  if (projects.length) {
    sectionHeader("KEY PROJECTS");
    projects.forEach((proj, idx) => {
      checkBreak(18);
      const name    = proj.name || proj.project_name || "";
      const context = proj.context || [proj.company, proj.year].filter(Boolean).join("  |  ");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...C.dark);
      doc.text(name, MH, y);
      if (context) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.gray);
        doc.text(context, PW - MH - doc.getTextWidth(context), y);
      }
      y += LH.base + 0.5;

      if (proj.description) {
        const endY = renderSegments(parseMarkers(proj.description), MH, y, CW, 10, C.dark, LH.base);
        y = endY + LH.base + 0.8;
      }

      const tech = proj.tech ?? proj.tech_stack;
      if (tech && (Array.isArray(tech) ? tech.length : tech)) {
        y += SP.techStackTop - 1;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...C.accent);
        const label = "Tech:  ";
        doc.text(label, MH, y);
        const lw = doc.getTextWidth(label);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...C.gray);
        const techStr = Array.isArray(tech) ? tech.join(", ") : String(tech);
        const tlines = doc.splitTextToSize(techStr, CW - lw);
        doc.text(tlines, MH + lw, y);
        y += (tlines.length - 1) * LH.sm + LH.sm;
      }
      if (idx < projects.length - 1) y += SP.betweenProject;
    });
  }

  // ── Awards & Recognition ───────────────────────────────────────────────────
  const awards = r.awards_recognition ?? r.awards ?? [];
  if (awards.length) {
    sectionHeader("AWARDS & RECOGNITION");
    awards.forEach((award, idx) => {
      checkBreak(14);
      const name    = award.name || award.award_name || "";
      const context = award.context || [award.company, award.year].filter(Boolean).join("  |  ");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...C.dark);
      doc.text(name, MH, y);
      if (context) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.gray);
        doc.text(context, PW - MH - doc.getTextWidth(context), y);
      }
      y += LH.base + 0.5;

      if (award.description) {
        const endY = renderSegments(parseMarkers(award.description), MH, y, CW, 10, C.dark, LH.base);
        y = endY + LH.base + 0.5;
      }
      if (idx < awards.length - 1) y += SP.betweenAward;
    });
  }

  // ── Download ───────────────────────────────────────────────────────────────
  doc.save(pdfFilename);
}
