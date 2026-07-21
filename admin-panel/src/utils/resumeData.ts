/**
 * Shared resume data model + parsing helpers.
 * Used by both pdfDownload.ts (HTML/print-based PDF) and docxDownload.ts (Word export).
 */

export interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

export interface ResumeHeader {
  name?: string;
  title?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin?: string | { display: string; url: string };
  github?: string | { display: string; url: string };
}

export interface SkillGroup {
  category?: string;
  values?: string | string[];
  skills?: string | string[];
}

/** technical_skills is a fixed-shape object (category key -> comma-separated string), not an array. */
export interface TechnicalSkills {
  programming?: string;
  softwares?: string;
  statistics_and_ml?: string;
  project_management?: string;
  languages?: string;
  [key: string]: string | undefined;
}

export interface CareerBreakdown {
  title?: string;
  job_title?: string;
  company?: string;
  date_range?: string;
  start?: string;
  end?: string;
  location?: string;
  promotion_note?: string;
  company_summary?: string;
  summary?: string;
  highlights?: string[];
  bullets?: string[];
  tech_stack?: string | string[];
  tech?: string | string[];
}

export interface EducationEntry {
  degree?: string;
  degree_name?: string;
  institution?: string;
  school?: string;
  location?: string;
  major?: string;
  highlights?: string;
  Relevant?: string;
  relevant?: string;
  year?: string;
  end?: string;
  dates?: string;
}

export interface CertEntry {
  name?: string;
  cert_name?: string;
  issuer?: string;
  date?: string;
  value_proposition?: string;
  description?: string;
}

export interface ProjectEntry {
  name?: string;
  project_name?: string;
  context?: string;
  company?: string;
  date?: string;
  year?: string;
  description?: string;
  tech?: string | string[];
  tech_stack?: string | string[];
}

export interface AchievementEntry {
  name?: string;
  award_name?: string;
  context?: string;
  company?: string;
  year?: string;
  description?: string;
}

export interface LeadershipEntry {
  name?: string;
  role_name?: string;
  role?: string;
  date?: string;
  date_range?: string;
  start?: string;
  end?: string;
  description?: string;
  highlights?: string[];
  bullets?: string[];
}

export interface ResumeData {
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
  technical_skills?: TechnicalSkills;
  career_breakdowns?: CareerBreakdown[];
  experience?: CareerBreakdown[];
  education?: EducationEntry[];
  certifications?: CertEntry[];
  key_projects?: ProjectEntry[];
  portfolio_projects?: ProjectEntry[];
  projects?: ProjectEntry[];
  achievement?: AchievementEntry[];
  awards?: AchievementEntry[];
  leadership?: LeadershipEntry[];
  leadership_enterpreneurial_experience?: LeadershipEntry[];
  // top-level envelope fields (legacy)
  resume?: ResumeData;
  cover_letter?: string | object;
}

// ─── technical_skills / skills normalization ───────────────────────────────

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  programming: "Programming",
  softwares: "Software",
  software: "Software",
  statistics_and_ml: "Statistics & ML",
  project_management: "Project Management",
  languages: "Languages",
};

function humanizeSkillCategory(key: string): string {
  if (SKILL_CATEGORY_LABELS[key]) return SKILL_CATEGORY_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalizes either the new `technical_skills` object or the legacy `skills` array into a unified {category, values}[] list. */
export function getSkillGroups(r: ResumeData): { category: string; values: string }[] {
  if (r.technical_skills && typeof r.technical_skills === "object") {
    return Object.entries(r.technical_skills)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([key, v]) => ({ category: humanizeSkillCategory(key), values: String(v) }));
  }
  if (r.skills?.length) {
    return r.skills.map((row) => {
      const v = row.values ?? row.skills ?? "";
      return { category: row.category || "", values: Array.isArray(v) ? v.join(", ") : String(v) };
    });
  }
  return [];
}

// ─── JSON extractor ────────────────────────────────────────────────────────

export function extractJSON(raw: string): { resume?: ResumeData } | null {
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

// ─── Inline marker parser (bold via **, italic via *wrap*) ────────────────

export function parseMarkers(raw: string | undefined): TextSegment[] {
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

/** Normalizes raw resume text/object (handles JSON strings, {resume:{...}} envelopes) into ResumeData, or null if unparseable. */
export function normalizeResumeData(resumeText: string | object): ResumeData | null {
  let r: ResumeData;
  if (typeof resumeText === "object") {
    const obj = resumeText as ResumeData;
    r = (obj as { resume?: ResumeData }).resume ?? obj;
  } else {
    const trimmed = (resumeText as string).trim();
    const parsed = extractJSON(trimmed);
    if (!parsed) return null;
    r = (parsed as { resume?: ResumeData }).resume ?? (parsed as ResumeData);
  }
  if (!r || (!r.header && !r.name && !r.summary)) return null;
  return r;
}
