/**
 * Client-side .docx generation for the admin panel.
 * Produces a real Word document — actual paragraph and bulleted-list elements —
 * so ATS resume parsers (which read DOCX structure directly, not heuristics
 * over positioned text like PDF) extract every section and entry correctly.
 */

import {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink,
  HeadingLevel, BorderStyle,
} from "docx";
import {
  ResumeData, ResumeHeader, CareerBreakdown, EducationEntry,
  CertEntry, ProjectEntry, AchievementEntry, LeadershipEntry, TextSegment,
  normalizeResumeData, parseMarkers, getSkillGroups,
} from "./resumeData";

const FONT = "Calibri";
const ACCENT = "1F4E79";
const GRAY = "555555";
const DARK = "1A1A1A";

function segmentsToRuns(segs: TextSegment[], opts: { size?: number; color?: string } = {}): TextRun[] {
  if (!segs.length) return [];
  return segs.map((s) => new TextRun({
    text: s.text,
    bold: s.bold,
    italics: s.italic,
    size: opts.size ?? 20,
    color: opts.color ?? DARK,
    font: FONT,
  }));
}

function linkOrText(display: string, url: string | undefined, size = 18): (TextRun | ExternalHyperlink)[] {
  if (!display) return [];
  if (!url) return [new TextRun({ text: display, size, color: GRAY, font: FONT })];
  return [new ExternalHyperlink({
    link: url,
    children: [new TextRun({ text: display, size, color: "2563EB", font: FONT, underline: {} })],
  })];
}

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ACCENT, space: 2 } },
    children: [new TextRun({ text: title.toUpperCase(), bold: true, color: ACCENT, size: 20, font: FONT })],
  });
}

export function buildResumeDocument(r: ResumeData): Document {
  const h: ResumeHeader = r.header ?? r;
  const children: Paragraph[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: (h.name || "").toUpperCase(), bold: true, size: 40, color: DARK, font: FONT })],
  }));

  if (h.title) {
    children.push(new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: h.title, size: 22, color: ACCENT, font: FONT })],
    }));
  }

  const contactRuns: (TextRun | ExternalHyperlink)[] = [];
  const pushContact = (display: string | undefined, url?: string) => {
    if (!display) return;
    if (contactRuns.length) contactRuns.push(new TextRun({ text: "  ·  ", size: 18, color: GRAY, font: FONT }));
    contactRuns.push(...linkOrText(display, url));
  };
  pushContact(h.location);
  pushContact(h.email, h.email ? `mailto:${h.email}` : undefined);
  pushContact(h.phone);
  if (h.linkedin) {
    const li = typeof h.linkedin === "object" ? h.linkedin : { display: String(h.linkedin), url: String(h.linkedin) };
    pushContact(li.display, li.url);
  }
  if (h.github) {
    const gh = typeof h.github === "object" ? h.github : { display: String(h.github), url: String(h.github) };
    pushContact(gh.display, gh.url);
  }
  if (contactRuns.length) {
    children.push(new Paragraph({ spacing: { after: 200 }, children: contactRuns }));
  }

  // ── Experience ──────────────────────────────────────────────────────────
  const jobs: CareerBreakdown[] = r.career_breakdowns ?? r.experience ?? [];
  if (jobs.length) {
    children.push(sectionHeading("Work Experience"));
    jobs.forEach((job, idx) => {
      const dateStr = job.date_range || [job.start, job.end || "Present"].filter(Boolean).join(" – ");
      children.push(new Paragraph({
        spacing: { before: idx > 0 ? 200 : 0, after: 20 },
        tabStops: [{ type: "right", position: 9350 }],
        children: [
          new TextRun({ text: job.title || job.job_title || "", bold: true, size: 22, color: DARK, font: FONT }),
          new TextRun({ text: `\t${dateStr}`, size: 18, color: GRAY, font: FONT }),
        ],
      }));
      const displayText = job.promotion_note || job.location || "";
      children.push(new Paragraph({
        spacing: { after: 80 },
        tabStops: [{ type: "right", position: 9350 }],
        children: [
          new TextRun({ text: job.company || "", size: 20, italics: true, color: DARK, font: FONT }),
          ...(displayText ? [new TextRun({ text: `\t${displayText}`, size: 16, color: GRAY, font: FONT })] : []),
        ],
      }));
      const bullets = job.highlights ?? job.bullets ?? [];
      bullets.forEach((bullet, bi) => {
        children.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { after: bi === bullets.length - 1 ? 100 : 40 },
          children: segmentsToRuns(parseMarkers(bullet)),
        }));
      });
    });
  }

  // ── Education ───────────────────────────────────────────────────────────
  if (r.education?.length) {
    children.push(sectionHeading("Education"));
    r.education.forEach((edu: EducationEntry, idx) => {
      const year = edu.year || edu.end || edu.dates || "";
      children.push(new Paragraph({
        spacing: { before: idx > 0 ? 120 : 0, after: 20 },
        tabStops: [{ type: "right", position: 9350 }],
        children: [
          new TextRun({ text: edu.degree || edu.degree_name || "", bold: true, size: 20, color: DARK, font: FONT }),
          ...(edu.major ? [new TextRun({ text: `  ·  ${edu.major}`, size: 19, color: GRAY, font: FONT })] : []),
          ...(year ? [new TextRun({ text: `\t${year}`, size: 18, color: GRAY, font: FONT })] : []),
        ],
      }));
      const subParts = [edu.institution || edu.school || "", edu.location].filter(Boolean).join("  ·  ");
      if (subParts) {
        children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: subParts, bold: true, size: 19, italics: true, color: GRAY, font: FONT })] }));
      }
      if (edu.highlights) {
        children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: edu.highlights, size: 19, color: GRAY, font: FONT })] }));
      }
      const relevant = edu.Relevant || edu.relevant || "";
      if (relevant) {
        children.push(new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "Relevant Coursework: ", bold: true, size: 19, color: GRAY, font: FONT }),
            new TextRun({ text: relevant, size: 19, color: GRAY, font: FONT }),
          ],
        }));
      }
    });
  }

  // ── Certifications ──────────────────────────────────────────────────────
  if (r.certifications?.length) {
    children.push(sectionHeading("Certifications"));
    r.certifications.forEach((cert: CertEntry, idx) => {
      const name = cert.name || cert.cert_name || "";
      children.push(new Paragraph({
        spacing: { before: idx > 0 ? 100 : 0, after: 20 },
        tabStops: [{ type: "right", position: 9350 }],
        children: [
          new TextRun({ text: name, bold: true, size: 20, color: DARK, font: FONT }),
          ...(cert.issuer ? [new TextRun({ text: `  ·  ${cert.issuer}`, size: 19, color: GRAY, font: FONT })] : []),
          ...(cert.date ? [new TextRun({ text: `\t${cert.date}`, size: 18, color: GRAY, font: FONT })] : []),
        ],
      }));
      const vp = cert.value_proposition || cert.description || "";
      if (vp) {
        children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: vp, size: 19, color: GRAY, font: FONT })] }));
      }
    });
  }

  // ── Portfolio Projects ──────────────────────────────────────────────────
  const projects: ProjectEntry[] = r.portfolio_projects ?? r.key_projects ?? r.projects ?? [];
  if (projects.length) {
    children.push(sectionHeading("Portfolio Projects"));
    projects.forEach((proj, idx) => {
      const name = proj.name || proj.project_name || "";
      const context = proj.date || proj.context || [proj.company, proj.year].filter(Boolean).join("  |  ");
      children.push(new Paragraph({
        spacing: { before: idx > 0 ? 120 : 0, after: 20 },
        tabStops: [{ type: "right", position: 9350 }],
        children: [
          new TextRun({ text: name, bold: true, size: 21, color: DARK, font: FONT }),
          ...(context ? [new TextRun({ text: `\t${context}`, size: 18, color: GRAY, font: FONT })] : []),
        ],
      }));
      if (proj.description) {
        children.push(new Paragraph({ spacing: { after: 40 }, children: segmentsToRuns(parseMarkers(proj.description), { size: 20 }) }));
      }
      const tech = proj.tech ?? proj.tech_stack;
      if (tech && (Array.isArray(tech) ? tech.length : tech)) {
        const techStr = Array.isArray(tech) ? tech.join(", ") : String(tech);
        children.push(new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: "Tech: ", bold: true, size: 19, color: ACCENT, font: FONT }),
            new TextRun({ text: techStr, size: 19, color: GRAY, font: FONT }),
          ],
        }));
      }
    });
  }

  // ── Leadership/Entrepreneurial Experience ──────────────────────────────
  const leadership: LeadershipEntry[] = r.leadership_enterpreneurial_experience ?? r.leadership ?? [];
  if (leadership.length) {
    children.push(sectionHeading("Leadership/Entrepreneurial Experience"));
    leadership.forEach((role, idx) => {
      const dateStr = role.date || role.date_range || [role.start, role.end || "Present"].filter(Boolean).join(" – ");
      children.push(new Paragraph({
        spacing: { before: idx > 0 ? 120 : 0, after: 20 },
        tabStops: [{ type: "right", position: 9350 }],
        children: [
          new TextRun({ text: role.name || role.role_name || "", bold: true, size: 21, color: DARK, font: FONT }),
          ...(dateStr ? [new TextRun({ text: `\t${dateStr}`, size: 18, color: GRAY, font: FONT })] : []),
        ],
      }));
      if (role.role) {
        children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: role.role, bold: true, size: 19, italics: true, color: GRAY, font: FONT })] }));
      }
      if (role.description) {
        children.push(new Paragraph({ spacing: { after: 40 }, children: segmentsToRuns(parseMarkers(role.description), { size: 20 }) }));
      }
      const bullets = role.highlights ?? role.bullets ?? [];
      bullets.forEach((bullet, bi) => {
        children.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { after: bi === bullets.length - 1 ? 100 : 40 },
          children: segmentsToRuns(parseMarkers(bullet)),
        }));
      });
    });
  }

  // ── Technical Skills ────────────────────────────────────────────────────
  const skillGroups = getSkillGroups(r);
  if (skillGroups.length) {
    children.push(sectionHeading("Technical Skills"));
    skillGroups.forEach((row) => {
      children.push(new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `${row.category}: `, bold: true, size: 20, color: DARK, font: FONT }),
          new TextRun({ text: row.values, size: 20, color: DARK, font: FONT }),
        ],
      }));
    });
  }

  // ── Achievements (legacy-only, not part of the current schema) ──────────
  const achievements: AchievementEntry[] = r.achievement ?? r.awards ?? [];
  if (achievements.length) {
    children.push(sectionHeading("Achievements"));
    achievements.forEach((achievement, idx) => {
      const name = achievement.name || achievement.award_name || "";
      const context = achievement.context || [achievement.company, achievement.year].filter(Boolean).join("  |  ");
      children.push(new Paragraph({
        spacing: { before: idx > 0 ? 120 : 0, after: 20 },
        tabStops: [{ type: "right", position: 9350 }],
        children: [
          new TextRun({ text: name, bold: true, size: 21, color: DARK, font: FONT }),
          ...(context ? [new TextRun({ text: `\t${context}`, size: 18, color: GRAY, font: FONT })] : []),
        ],
      }));
      if (achievement.description) {
        children.push(new Paragraph({ spacing: { after: 40 }, children: segmentsToRuns(parseMarkers(achievement.description), { size: 20 }) }));
      }
    });
  }

  return new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children,
    }],
    styles: {
      default: {
        document: { run: { font: FONT, size: 20 } },
      },
    },
  });
}

export async function downloadResumeDocx(resumeText: string | object, filename: string): Promise<void> {
  const r = normalizeResumeData(resumeText);
  if (!r) {
    console.error("[docxDownload] no valid resume data found");
    return;
  }

  const doc = buildResumeDocument(r);
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
