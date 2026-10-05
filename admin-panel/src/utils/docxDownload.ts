/**
 * Client-side .docx generation for the admin panel.
 * Produces a real Word document (actual paragraph / bulleted-list elements) so ATS parsers
 * read the structure directly.
 *
 * The CONTENT mirrors swiftcv/pdfGenerator.js exactly (same header fields, same sections in
 * the same order with the same titles, same field fallbacks per entry). The LOOK follows the
 * selected resume template (1-20) as closely as Word allows: see docxTemplates.ts.
 */

import {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, BorderStyle, ShadingType,
  AlignmentType, Table, TableRow, TableCell, WidthType, TableLayoutType, UnderlineType,
  VerticalAlign, IParagraphOptions,
} from "docx";
import {
  ResumeData, TextSegment, normalizeResumeData, parseMarkers, getSkillGroups,
} from "./resumeData";
import {
  getDocxTemplateStyle, resolveColor, DocxTemplateStyle, HeaderStyle,
} from "./docxTemplates";

const FONT = "Lato"; // swiftcv renders every template in Lato; Word substitutes if not installed
const BODY = "18181B";
const BODY_MUTED = "3F3F46";
const GRAY = "52525B";

// US Letter, margins from swiftcv (18mm sides, 14mm top/bottom), in twips
const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN_H = 1021;
const MARGIN_V = 794;
const CONTENT_W = PAGE_W - MARGIN_H * 2;

type Block = Paragraph | Table;
type Run = TextRun | ExternalHyperlink;
const pt = (n: number) => Math.round(n * 2); // points -> half-points

interface Ctx {
  st: DocxTemplateStyle;
  tabPos: number; // right tab stop (twips) for the column the body lives in
}

// ─── Data normalization (same as swiftcv generateResumePDF) ─────────────────

type AnyRec = Record<string, any>;

/** {resume:{...}} is already unwrapped by normalizeResumeData; merge header into root with root winning, like swiftcv. */
function flatten(r: ResumeData): AnyRec {
  const d = r as AnyRec;
  return d.header && typeof d.header === "object" ? Object.assign({}, d.header, d) : d;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

// ─── Run helpers ────────────────────────────────────────────────────────────

function run(text: string, o: { size: number; color: string; bold?: boolean; italics?: boolean; shading?: string; underline?: boolean; underlineColor?: string }): TextRun {
  return new TextRun({
    text, font: FONT, size: pt(o.size), color: o.color, bold: o.bold, italics: o.italics,
    shading: o.shading ? { type: ShadingType.CLEAR, fill: o.shading, color: "auto" } : undefined,
    underline: o.underline ? { type: UnderlineType.THICK, color: o.underlineColor } : undefined,
  });
}

function segRuns(segs: TextSegment[], size: number, color: string): TextRun[] {
  return segs.map((s) => run(s.text, { size, color, bold: s.bold, italics: s.italic }));
}

const right = (ctx: Ctx) => [{ type: "right" as const, position: ctx.tabPos }];

// ─── Header ─────────────────────────────────────────────────────────────────

interface ContactPart { text: string; url?: string }

function contactParts(d: AnyRec, sidebarOrder = false): ContactPart[] {
  const parts: ContactPart[] = [];
  const li = d.linkedin
    ? (typeof d.linkedin === "object" ? d.linkedin : { display: d.linkedin, url: d.linkedin })
    : null;
  if (sidebarOrder) {
    // swiftcv template 8 order: email, phone, location, linkedin (no links)
    if (d.email) parts.push({ text: str(d.email) });
    if (d.phone) parts.push({ text: str(d.phone) });
    if (d.location) parts.push({ text: str(d.location) });
    if (li && li.display) parts.push({ text: str(li.display) });
    return parts;
  }
  if (d.location) parts.push({ text: str(d.location) });
  if (d.email) parts.push({ text: str(d.email), url: `mailto:${d.email}` });
  if (d.phone) parts.push({ text: str(d.phone) });
  if (li && li.display) parts.push({ text: str(li.display), url: li.url ? str(li.url) : undefined });
  return parts;
}

function contactRuns(parts: ContactPart[], hs: HeaderStyle, st: DocxTemplateStyle, onBand: boolean): Run[] {
  const textColor = onBand || hs.contactColor === "white" ? "FFFFFF" : GRAY;
  const linkColor = onBand || hs.contactColor === "white" ? "FFFFFF" : st.accent;
  const out: Run[] = [];
  parts.forEach((p, i) => {
    if (i > 0) out.push(run(" · ", { size: hs.contactSize, color: textColor }));
    if (p.url) {
      out.push(new ExternalHyperlink({
        link: p.url,
        children: [new TextRun({ text: p.text, font: FONT, size: pt(hs.contactSize), color: linkColor })],
      }));
    } else {
      out.push(run(p.text, { size: hs.contactSize, color: textColor }));
    }
  });
  return out;
}

const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function ruleBorder(st: DocxTemplateStyle, hs: HeaderStyle) {
  if (!hs.rule) return undefined;
  const style = hs.rule.style === "double" ? BorderStyle.DOUBLE : hs.rule.style === "dashed" ? BorderStyle.DASHED : BorderStyle.SINGLE;
  return { style, size: hs.rule.size, color: resolveColor(st, hs.rule.color), space: 6 };
}

function nameText(d: AnyRec, hs: HeaderStyle): string {
  const n = str(d.name);
  return hs.nameCase === "lower" ? n.toLowerCase() : n.toUpperCase();
}

function titleText(d: AnyRec, hs: HeaderStyle): string {
  const t = str(d.title);
  return hs.titleUpper ? t.toUpperCase() : t;
}

function nameParagraph(d: AnyRec, st: DocxTemplateStyle, hs: HeaderStyle, color?: string, extra: Partial<IParagraphOptions> = {}): Paragraph {
  return new Paragraph({
    alignment: ALIGN[hs.align], spacing: { after: 40 },
    ...extra,
    children: [run(nameText(d, hs), { size: hs.nameSize, bold: true, color: color ?? resolveColor(st, hs.nameColor) })],
  });
}

function titleParagraph(d: AnyRec, st: DocxTemplateStyle, hs: HeaderStyle, color?: string, extra: Partial<IParagraphOptions> = {}): Paragraph | null {
  if (!d.title) return null;
  const c = color ?? resolveColor(st, hs.titleColor);
  const children: TextRun[] = [];
  if (hs.titleBullet) children.push(run("● ", { size: hs.titleSize - 3, color: st.accent }));
  children.push(run(titleText(d, hs), { size: hs.titleSize, color: c, bold: hs.titleBold, italics: hs.titleItalic }));
  return new Paragraph({ alignment: ALIGN[hs.align], spacing: { after: 60 }, ...extra, children });
}

function bandTable(rows: Block[][], widths: number[], fills: (string | undefined)[], vAlignTop = true): Table {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [new TableRow({
      children: rows.map((children, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        borders: NO_BORDERS,
        verticalAlign: vAlignTop ? VerticalAlign.TOP : VerticalAlign.CENTER,
        shading: fills[i] ? { type: ShadingType.CLEAR, fill: fills[i] as string, color: "auto" } : undefined,
        margins: { top: 200, bottom: 200, left: 280, right: 280 },
        children: children as Paragraph[],
      })),
    })],
  });
}

function spacer(after = 120, border?: ReturnType<typeof ruleBorder>): Paragraph {
  return new Paragraph({ spacing: { before: 0, after, line: 20, lineRule: "exact" }, border: border ? { bottom: border } : undefined, children: [] });
}

function buildHeader(d: AnyRec, ctx: Ctx): Block[] {
  const { st } = ctx;
  const hs = st.header;
  const parts = contactParts(d);
  const rb = ruleBorder(st, hs);
  const out: Block[] = [];

  switch (hs.layout) {
    case "band": {
      const fill = resolveColor(st, hs.bandFill ?? "dark");
      const cell: Paragraph[] = [nameParagraph(d, st, hs)];
      const tp = titleParagraph(d, st, hs); if (tp) cell.push(tp);
      if (hs.contactInBand && parts.length) cell.push(new Paragraph({ children: contactRuns(parts, hs, st, true) }));
      out.push(bandTable([cell], [CONTENT_W], [fill]));
      if (!hs.contactInBand && parts.length) {
        out.push(new Paragraph({ spacing: { before: 100, after: 60 }, border: rb ? { bottom: rb } : undefined, children: contactRuns(parts, hs, st, false) }));
      } else out.push(spacer());
      break;
    }
    case "twotone": {
      const left = Math.round(CONTENT_W * 0.62);
      const cell: Paragraph[] = [nameParagraph(d, st, hs)];
      const tp = titleParagraph(d, st, hs); if (tp) cell.push(tp);
      out.push(bandTable([cell, [new Paragraph({ children: [] })]], [left, CONTENT_W - left], [resolveColor(st, "dark"), st.accent]));
      out.push(new Paragraph({ spacing: { before: 100, after: 60 }, border: rb ? { bottom: rb } : undefined, children: contactRuns(parts, hs, st, false) }));
      break;
    }
    case "split": {
      const lw = Math.round(CONTENT_W * 0.5);
      const l: Paragraph[] = [nameParagraph(d, st, hs)];
      const tp = titleParagraph(d, st, hs); if (tp) l.push(tp);
      const r2 = [new Paragraph({ alignment: AlignmentType.RIGHT, children: contactRuns(parts, hs, st, false) })];
      out.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [lw, CONTENT_W - lw], layout: TableLayoutType.FIXED,
        borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
        rows: [new TableRow({ children: [
          new TableCell({ width: { size: lw, type: WidthType.DXA }, borders: NO_BORDERS, margins: { left: 0, right: 0 }, children: l }),
          new TableCell({ width: { size: CONTENT_W - lw, type: WidthType.DXA }, borders: NO_BORDERS, margins: { left: 0, right: 0 }, children: r2 }),
        ] })],
      }));
      out.push(spacer(160, rb));
      break;
    }
    case "framed": {
      const box = { style: BorderStyle.SINGLE, size: 8, color: st.accent, space: 6 };
      const border = { top: box, bottom: box, left: box, right: box };
      out.push(nameParagraph(d, st, hs, undefined, { border, spacing: { before: 60, after: 40 } }));
      const tp = titleParagraph(d, st, hs, undefined, { border }); if (tp) out.push(tp);
      if (parts.length) out.push(new Paragraph({ alignment: AlignmentType.CENTER, border, spacing: { after: 160 }, children: contactRuns(parts, hs, st, false) }));
      break;
    }
    default: { // plain (with optional top bar / left bar / bottom rule)
      const top = hs.topBar ? { top: { style: BorderStyle.SINGLE, size: hs.topBar.size, color: resolveColor(st, hs.topBar.color), space: 8 } } : {};
      const bar = hs.leftBar ? { left: { style: BorderStyle.SINGLE, size: 36, color: resolveColor(st, hs.leftBar), space: 10 } } : {};
      const b = { ...top, ...bar };
      out.push(nameParagraph(d, st, hs, undefined, { border: b }));
      const tp = titleParagraph(d, st, hs, undefined, { border: bar }); if (tp) out.push(tp);
      if (parts.length) {
        out.push(new Paragraph({
          alignment: ALIGN[hs.align], spacing: { after: rb ? 100 : 160 },
          border: { ...bar, ...(rb ? { bottom: rb } : {}) },
          children: contactRuns(parts, hs, st, false),
        }));
      } else if (rb) out.push(spacer(100, rb));
      if (hs.secondRule) out.push(spacer(120, { style: BorderStyle.SINGLE, size: 6, color: resolveColor(st, hs.secondRule), space: 1 }));
    }
  }
  return out;
}

// ─── Section headings ───────────────────────────────────────────────────────

function sectionHeading(title: string, ctx: Ctx): Paragraph {
  const { st } = ctx;
  const ss = st.section;
  const text = title.toUpperCase();
  const color = resolveColor(st, ss.color);
  const children: TextRun[] = [];
  if (ss.decor === "dot") children.push(run("● ", { size: ss.size - 1, color: st.accent }));
  if (ss.decor === "triangle") children.push(run("▶ ", { size: ss.size - 2, color: st.accent }));
  if (ss.decor === "pill") children.push(run(` ${text} `, { size: ss.size, color, bold: true, shading: st.accent }));
  else if (ss.decor === "boxed") children.push(run(` ${text} `, { size: ss.size, color, bold: true, shading: st.dark }));
  else children.push(run(text, { size: ss.size, color, bold: true, underline: ss.decor === "shortline", underlineColor: st.accent }));

  return new Paragraph({
    alignment: ss.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
    keepNext: true,
    spacing: { before: 260, after: 100 },
    border: {
      ...(ss.rule ? { bottom: { style: BorderStyle.SINGLE, size: ss.ruleSize ?? 6, color: resolveColor(st, ss.rule), space: 2 } } : {}),
      ...(ss.decor === "square" ? { left: { style: BorderStyle.SINGLE, size: 24, color: st.accent, space: 6 } } : {}),
    },
    children,
  });
}

// ─── Body (content identical to swiftcv _renderCommonSections) ─────────────

function bulletParagraph(text: string, last: boolean): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: last ? 100 : 40 },
    children: segRuns(parseMarkers(text), 10, BODY),
  });
}

function buildBody(d: AnyRec, ctx: Ctx): Paragraph[] {
  const { st } = ctx;
  const c: Paragraph[] = [];

  // Summary
  if (d.summary) {
    c.push(sectionHeading("Summary", ctx));
    c.push(new Paragraph({ spacing: { after: 120 }, children: segRuns(parseMarkers(d.summary), 10, BODY) }));
  }

  // Work experience
  const jobs: AnyRec[] = d.career_breakdowns || d.experience || [];
  if (jobs.length) {
    c.push(sectionHeading("Work Experience", ctx));
    jobs.forEach((job, idx) => {
      const dateStr = job.date_range || [job.start, job.end || "Present"].filter(Boolean).join(" – ");
      c.push(new Paragraph({
        spacing: { before: idx > 0 ? 200 : 0, after: 20 }, keepNext: true, tabStops: right(ctx),
        children: [
          run(str(job.title || job.job_title), { size: 10.5, bold: true, color: st.dark }),
          run(`\t${dateStr}`, { size: 9, color: GRAY }),
        ],
      }));
      const displayText = job.promotion_note || job.location || "";
      c.push(new Paragraph({
        spacing: { after: 80 }, keepNext: true, tabStops: right(ctx),
        children: [
          run(str(job.company), { size: 10, color: BODY_MUTED }),
          ...(displayText ? [run(`\t${displayText}`, { size: 8, color: GRAY })] : []),
        ],
      }));
      const bullets: string[] = job.highlights || job.bullets || [];
      bullets.forEach((b, bi) => c.push(bulletParagraph(b, bi === bullets.length - 1)));
    });
  }

  // Education
  const edus: AnyRec[] = d.education || [];
  if (edus.length) {
    c.push(sectionHeading("Education", ctx));
    edus.forEach((edu, idx) => {
      const year = edu.year || edu.end || "";
      c.push(new Paragraph({
        spacing: { before: idx > 0 ? 120 : 0, after: 20 }, keepNext: true, tabStops: right(ctx),
        children: [
          run(str(edu.degree || edu.degree_name), { size: 10, bold: true, color: BODY }),
          ...(edu.major ? [run(`  ·  ${edu.major}`, { size: 9.5, color: BODY_MUTED })] : []),
          ...(year ? [run(`\t${year}`, { size: 9.5, color: GRAY })] : []),
        ],
      }));
      const subParts = [edu.school || edu.institution || "", edu.location].filter(Boolean).join("  ·  ");
      if (subParts) c.push(new Paragraph({ spacing: { after: 40 }, children: [run(subParts, { size: 9.5, bold: true, color: BODY_MUTED })] }));
      if (edu.highlights) c.push(new Paragraph({ spacing: { after: 20 }, children: [run(str(edu.highlights), { size: 9.5, color: BODY_MUTED })] }));
      const relevant = edu.Relevant || edu.relevant || "";
      if (relevant) {
        c.push(new Paragraph({
          spacing: { after: 60 },
          children: [
            run("Relevant Coursework: ", { size: 9.5, bold: true, color: BODY_MUTED }),
            run(str(relevant), { size: 9.5, color: BODY_MUTED }),
          ],
        }));
      }
    });
  }

  // Certifications
  const certs: AnyRec[] = d.certifications || [];
  if (certs.length) {
    c.push(sectionHeading("Certifications", ctx));
    certs.forEach((cert, idx) => {
      c.push(new Paragraph({
        spacing: { before: idx > 0 ? 100 : 0, after: 20 }, keepNext: true, tabStops: right(ctx),
        children: [
          run(str(cert.name || cert.cert_name), { size: 10, bold: true, color: BODY }),
          ...(cert.issuer ? [run(`  ·  ${cert.issuer}`, { size: 9.5, color: BODY_MUTED })] : []),
          ...(cert.date ? [run(`\t${cert.date}`, { size: 9, color: GRAY })] : []),
        ],
      }));
      const vp = cert.value_proposition || cert.description || "";
      if (vp) c.push(new Paragraph({ spacing: { after: 40 }, children: [run(str(vp), { size: 9.5, color: BODY_MUTED })] }));
    });
  }

  // Portfolio projects
  const projects: AnyRec[] = d.portfolio_projects || d.key_projects || d.projects || [];
  if (projects.length) {
    c.push(sectionHeading("Portfolio Projects", ctx));
    projects.forEach((proj, idx) => {
      const context = proj.date || [proj.company, proj.year].filter(Boolean).join("  |  ");
      c.push(new Paragraph({
        spacing: { before: idx > 0 ? 120 : 0, after: 20 }, keepNext: true, tabStops: right(ctx),
        children: [
          run(str(proj.name || proj.project_name), { size: 10.5, bold: true, color: st.dark }),
          ...(context ? [run(`\t${context}`, { size: 9, color: GRAY })] : []),
        ],
      }));
      if (proj.description) c.push(new Paragraph({ spacing: { after: 40 }, children: segRuns(parseMarkers(proj.description), 10, BODY) }));
      const tech = proj.tech || proj.tech_stack || [];
      if (tech.length) {
        c.push(new Paragraph({
          spacing: { after: 40 },
          children: [
            run("Tech:  ", { size: 9.5, color: st.accent }),
            run(Array.isArray(tech) ? tech.join(", ") : str(tech), { size: 9.5, color: BODY_MUTED }),
          ],
        }));
      }
    });
  }

  // Leadership / entrepreneurial experience
  const leadership: AnyRec[] = d.leadership_enterpreneurial_experience || d.leadership || [];
  if (leadership.length) {
    c.push(sectionHeading("Leadership/Entrepreneurial Experience", ctx));
    leadership.forEach((role, idx) => {
      const dateStr = role.date || role.date_range || [role.start, role.end || "Present"].filter(Boolean).join(" – ");
      c.push(new Paragraph({
        spacing: { before: idx > 0 ? 120 : 0, after: 20 }, keepNext: true, tabStops: right(ctx),
        children: [
          run(str(role.name || role.role_name), { size: 10.5, bold: true, color: BODY }),
          ...(dateStr ? [run(`\t${dateStr}`, { size: 9, color: GRAY })] : []),
        ],
      }));
      if (role.role) c.push(new Paragraph({ spacing: { after: 20 }, children: [run(str(role.role), { size: 9.5, bold: true, color: BODY_MUTED })] }));
      if (role.description) c.push(new Paragraph({ spacing: { after: 40 }, children: segRuns(parseMarkers(role.description), 10, BODY) }));
      const bullets: string[] = role.highlights || role.bullets || [];
      bullets.forEach((b, bi) => c.push(bulletParagraph(b, bi === bullets.length - 1)));
    });
  }

  // Technical skills
  const skillGroups = getSkillGroups(d as ResumeData);
  if (skillGroups.length) {
    c.push(sectionHeading("Technical Skills", ctx));
    skillGroups.forEach((row) => {
      c.push(new Paragraph({
        spacing: { after: 60 },
        children: [
          run(`${row.category}: `, { size: 9.5, bold: true, color: BODY }),
          run(row.values, { size: 9.5, color: BODY }),
        ],
      }));
    });
  }

  // Achievements (legacy-only, renders last)
  const achievements: AnyRec[] = d.achievement || d.awards_recognition || d.awards || [];
  if (achievements.length) {
    c.push(sectionHeading("Achievements", ctx));
    achievements.forEach((award, idx) => {
      const context = [award.company, award.year].filter(Boolean).join("  |  ");
      c.push(new Paragraph({
        spacing: { before: idx > 0 ? 120 : 0, after: 20 }, keepNext: true, tabStops: right(ctx),
        children: [
          run(str(award.name || award.award_name), { size: 10.5, bold: true, color: BODY }),
          ...(context ? [run(`\t${context}`, { size: 9, color: GRAY })] : []),
        ],
      }));
      if (award.description) c.push(new Paragraph({ spacing: { after: 40 }, children: segRuns(parseMarkers(award.description), 10, BODY) }));
    });
  }

  return c;
}

// ─── Sidebar layout (template 8) ────────────────────────────────────────────

function buildSidebarLayout(d: AnyRec, st: DocxTemplateStyle): Block[] {
  const hs = st.header;
  const sideW = 2900; // ~ swiftcv's 58mm sidebar, minus the page margin
  const bodyW = CONTENT_W - sideW;
  const side: Paragraph[] = [nameParagraph(d, st, hs, "FFFFFF")];
  const tp = titleParagraph(d, st, hs, "FFFFFF"); if (tp) side.push(tp);
  side.push(new Paragraph({ spacing: { after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: st.accent, space: 4 } }, children: [] }));
  contactParts(d, true).forEach((p) => side.push(new Paragraph({ spacing: { after: 60 }, children: [run(p.text, { size: hs.contactSize, color: "FFFFFF" })] })));

  const body = buildBody(d, { st, tabPos: bodyW - 600 });
  if (!body.length) body.push(new Paragraph({ children: [] }));

  return [new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [sideW, bodyW], layout: TableLayoutType.FIXED,
    borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: sideW, type: WidthType.DXA }, borders: NO_BORDERS, verticalAlign: VerticalAlign.TOP,
        shading: { type: ShadingType.CLEAR, fill: st.dark, color: "auto" },
        margins: { top: 240, bottom: 240, left: 200, right: 200 }, children: side,
      }),
      new TableCell({
        width: { size: bodyW, type: WidthType.DXA }, borders: NO_BORDERS, verticalAlign: VerticalAlign.TOP,
        margins: { top: 0, bottom: 240, left: 300, right: 0 }, children: body,
      }),
    ] })],
  }), new Paragraph({ children: [] })];
}

// ─── Document ───────────────────────────────────────────────────────────────

export function buildResumeDocument(r: ResumeData, templateId = 11): Document {
  const tid = Math.max(1, Math.min(20, Math.round(Number(templateId)) || 11));
  const st = getDocxTemplateStyle(tid);
  const d = flatten(r);

  const children: Block[] = st.header.layout === "sidebar"
    ? buildSidebarLayout(d, st)
    : (() => {
        const ctx: Ctx = { st, tabPos: CONTENT_W };
        return [...buildHeader(d, ctx), ...buildBody(d, ctx)];
      })();
  if (!children.length) children.push(new Paragraph({ children: [] }));

  return new Document({
    creator: "Resume",
    title: str(d.name) || "Resume",
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN_V, bottom: MARGIN_V, left: MARGIN_H, right: MARGIN_H } } },
      children,
    }],
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  });
}

export async function downloadResumeDocx(resumeText: string | object, filename: string, templateId = 11): Promise<void> {
  const r = normalizeResumeData(resumeText);
  if (!r) {
    console.error("[docxDownload] no valid resume data found");
    return;
  }

  const doc = buildResumeDocument(r, templateId);
  const blob = await Packer.toBlob(doc);
  const docxFilename = filename.endsWith(".docx") ? filename : filename + ".docx";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = docxFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
