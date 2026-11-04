/**
 * Shared resume data model + parsing helpers.
 * Used by docxDownload.ts (Word export); PDFs are produced by the vendored swiftcv generator (pdfDownload.ts).
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
  languages: "Programming Languages",
};

function humanizeSkillCategory(key: string): string {
  if (SKILL_CATEGORY_LABELS[key]) return SKILL_CATEGORY_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SPOKEN_LANGUAGES = new Set([
  "english", "spanish", "french", "german", "portuguese", "italian", "dutch", "polish", "russian", "ukrainian",
  "turkish", "arabic", "hindi", "chinese", "mandarin", "cantonese", "japanese", "korean", "vietnamese", "thai",
  "indonesian", "malay", "swedish", "norwegian", "danish", "finnish", "greek", "czech", "romanian", "hungarian",
  "hebrew", "bengali", "urdu", "punjabi", "tamil", "telugu", "tagalog", "filipino", "persian", "farsi", "swahili",
  "serbian", "croatian", "bulgarian", "slovak",
]);

/** True for human languages ("English", "Spanish (Fluent)") — they never belong in technical skills. Mirrors swiftcv. */
export function isSpokenLanguage(item: string): boolean {
  const base = String(item || "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(native|fluent|professional|conversational|basic|proficient|bilingual|intermediate|advanced|working|proficiency|full|limited|elementary)\b/gi, " ")
    .replace(/[-–:]/g, " ")
    .trim()
    .toLowerCase();
  return SPOKEN_LANGUAGES.has(base);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Any date or range -> "Mon YYYY" / "Mon YYYY - Present"; a resume never shows a day. Mirrors swiftcv _fmtDate. */
export function formatMonthYear(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  const named = (w: string) => MONTHS.findIndex((x) => x.toLowerCase() === w.slice(0, 3).toLowerCase());
  const mon = (n: number, y: string) => (n >= 1 && n <= 12 ? `${MONTHS[n - 1]} ${y}` : y);
  const one = (raw: string): string => {
    const t = raw.trim().replace(/[.,]$/, "");
    if (!t) return "";
    if (/^(present|current|now|ongoing)$/i.test(t)) return "Present";
    let m: RegExpMatchArray | null;
    if ((m = t.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?(?:[T\s].*)?$/))) return mon(+m[2], m[1]);
    if ((m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) return +m[1] > 12 ? mon(+m[2], m[3]) : mon(+m[1], m[3]);
    if ((m = t.match(/^(\d{1,2})[-/.](\d{4})$/))) return mon(+m[1], m[2]);
    if ((m = t.match(/^([A-Za-z]{3,})\.?\s+(?:\d{1,2}(?:st|nd|rd|th)?,?\s+)?(\d{4})$/)) && named(m[1]) >= 0) return `${MONTHS[named(m[1])]} ${m[2]}`;
    if ((m = t.match(/^\d{1,2}(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\.?,?\s+(\d{4})$/)) && named(m[1]) >= 0) return `${MONTHS[named(m[1])]} ${m[2]}`;
    return t;
  };
  const parts = s.split(/\s+(?:-|–|—|to)\s+|\s*[–—]\s*/i).filter((p) => p.trim() !== "");
  if (parts.length === 2) return `${one(parts[0])} - ${one(parts[1])}`;
  return one(s);
}

/** Spoken languages for the Languages section (root `languages` array or comma string). */
export function getLanguages(r: ResumeData): string[] {
  const raw = (r as Record<string, unknown>).languages ?? (r as Record<string, unknown>).spoken_languages;
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw.map((l) => {
        if (!l || typeof l !== "object") return l;
        const o = l as Record<string, unknown>;
        const lvl = o.proficiency || o.level;
        return String(o.language || o.name || "") + (lvl ? ` (${lvl})` : "");
      })
    : String(raw).split(",");
  return list.map((l) => String(l ?? "").trim()).filter(Boolean);
}

/** Normalizes either the new `technical_skills` object or the legacy `skills` array into a unified {category, values}[] list.
 *  Spoken languages are removed (they go in the Languages section). */
export function getSkillGroups(r: ResumeData): { category: string; values: string }[] {
  const clean = (v: unknown) => (Array.isArray(v) ? v : String(v ?? "").split(","))
    .map((x) => String(x).trim())
    .filter((x) => x && !isSpokenLanguage(x))
    .join(", ");
  const skip = (k: string) => /^(spoken_languages|human_languages|spoken languages)$/i.test(k);
  if (r.technical_skills && typeof r.technical_skills === "object" && !Array.isArray(r.technical_skills)) {
    return Object.entries(r.technical_skills)
      .filter(([key]) => !skip(key))
      .map(([key, v]) => ({ category: humanizeSkillCategory(key), values: clean(v) }))
      .filter((row) => row.values !== "");
  }
  if (r.skills?.length) {
    return r.skills
      .filter((row) => !skip(row.category || ""))
      .map((row) => ({ category: row.category || "", values: clean(row.values ?? row.skills ?? "") }))
      .filter((row) => row.values !== "");
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

  // Truncation recovery (mirrors swiftcv _extractJSON step 6): salvage just the "resume" object.
  const resumeKey = s.indexOf('"resume"');
  if (resumeKey !== -1) {
    const objStart = s.indexOf("{", resumeKey);
    if (objStart !== -1) {
      let depth = 0, i = objStart, found = -1;
      while (i < s.length) {
        const ch = s[i];
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { found = i; break; } }
        i++;
      }
      const resumeSlice = found !== -1
        ? s.slice(objStart, found + 1)
        : s.slice(objStart).replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "") + "}";
      try { return { resume: JSON.parse(resumeSlice) }; } catch (_) { /* continue */ }
    }
  }
  return null;
}

// ─── Inline marker parser (bold via **, italic via *wrap*) ────────────────

export function parseMarkers(raw: string | undefined): TextSegment[] {
  // Mirrors swiftcv/pdfGenerator.js PDFGenerator._parseMarkers exactly.
  if (!raw) return [];
  const str = String(raw);
  const isItalic =
    str.startsWith("*") && !str.startsWith("**") &&
    str.endsWith("*")   && !str.endsWith("**");
  const inner = isItalic ? str.slice(1, -1) : str;
  const segments: TextSegment[] = [];
  const re = /\*\*(.+?)\*\*/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(inner)) !== null) {
    if (match.index > lastIndex) segments.push({ text: inner.slice(lastIndex, match.index), bold: false, italic: isItalic });
    segments.push({ text: match[1], bold: true, italic: isItalic });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < inner.length) segments.push({ text: inner.slice(lastIndex), bold: false, italic: isItalic });
  return segments.filter((s) => s.text.length > 0);
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
