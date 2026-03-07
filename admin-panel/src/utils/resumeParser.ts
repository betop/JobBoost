/**
 * Resume parser utility — extracts structured data from raw resume text.
 * Uses heuristic regex matching (no external API needed).
 */

export interface ParsedEducation {
  university?: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
}

export interface ParsedWorkExperience {
  job_title?: string;
  company?: string;
  employment_type?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface ParsedProfile {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  job_category?: string;
  education?: ParsedEducation[];
  work_experience?: ParsedWorkExperience[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function extractEmail(text: string): string | undefined {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m?.[0];
}

function extractPhone(text: string): string | undefined {
  const m = text.match(
    /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/
  );
  return m?.[0]?.trim();
}

function extractLinkedIn(text: string): string | undefined {
  const m = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s,)>]+/i);
  return m?.[0];
}

function extractGitHub(text: string): string | undefined {
  const m = text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s,)>]+/i);
  return m?.[0];
}

/** Find the section block between two section headings */
function extractSection(text: string, ...headings: string[]): string {
  const sectionPattern = headings
    .map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const stopWords =
    "experience|education|skills|summary|objective|profile|projects|certifications|awards|publications|references|work|employment|languages|interests|volunteering|extracurricular|activities";
  const re = new RegExp(
    `(?:${sectionPattern})[:\\s]*\\n([\\s\\S]*?)(?=\\n(?:${stopWords})[:\\s]*\\n|$)`,
    "i"
  );
  return re.exec(text)?.[1]?.trim() ?? "";
}

/** Convert date strings like "Jan 2020", "January 2020", "2020-01", "2020" to YYYY-MM */
function normaliseDate(raw: string): string {
  if (!raw || /present|current|now/i.test(raw)) return "";
  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(raw.trim())) return raw.trim();
  // YYYY-MM-DD
  const ymd = raw.match(/(\d{4})-(\d{2})-\d{2}/);
  if (ymd) return `${ymd[1]}-${ymd[2]}`;
  // MM/YYYY or MM/DD/YYYY
  const mdy = raw.match(/(\d{2})\/(\d{4})/);
  if (mdy) return `${mdy[2]}-${mdy[1].padStart(2, "0")}`;
  // Month YYYY
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const mv = raw.match(/([a-z]{3})[a-z]*[\s.,]+(\d{4})/i);
  if (mv) {
    const mo = months[mv[1].toLowerCase()];
    return mo ? `${mv[2]}-${mo}` : "";
  }
  // Just a year
  const yr = raw.match(/(\d{4})/);
  if (yr) return `${yr[1]}-01`;
  return "";
}

/** Date range: "Jan 2020 – Mar 2022" or "2019 - Present" etc. */
function parseDateRange(text: string): { start: string; end: string } {
  const range = text.match(
    /([a-zA-Z]{0,9}\.?\s*\d{4})\s*[-–—]\s*([a-zA-Z]{0,9}\.?\s*(?:\d{4}|present|current|now))/i
  );
  if (range) {
    return { start: normaliseDate(range[1]), end: normaliseDate(range[2]) };
  }
  // Single date
  const single = text.match(/([a-zA-Z]{3,9}\.?\s*\d{4}|\d{4})/i);
  if (single) return { start: normaliseDate(single[1]), end: "" };
  return { start: "", end: "" };
}

// ── education ─────────────────────────────────────────────────────────────────

const DEGREE_KEYWORDS = [
  "Bachelor", "Master", "PhD", "Ph.D", "Doctor", "Associate", "B.Sc", "M.Sc",
  "B.S.", "M.S.", "MBA", "BBA", "B.A.", "M.A.", "B.E.", "M.E.", "B.Tech",
  "M.Tech", "B.Com", "M.Com", "B.Eng", "M.Eng", "Diploma", "Certificate",
];

function parseEducation(text: string): ParsedEducation[] {
  const section = extractSection(text, "education", "academic background", "qualifications");
  if (!section) return [];

  // Split by blank lines or degree keywords
  const blocks = section
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const results: ParsedEducation[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const entry: ParsedEducation = {};

    // Find degree line
    const degreeLine = lines.find((l) =>
      DEGREE_KEYWORDS.some((kw) => new RegExp(`\\b${kw}`, "i").test(l))
    );

    if (degreeLine) {
      // Try "Bachelor of Science in Computer Science"
      const inMatch = degreeLine.match(/(.+?)\s+(?:in|of)\s+(.+)/i);
      if (inMatch) {
        entry.degree = inMatch[1].trim();
        entry.field_of_study = inMatch[2].trim();
      } else {
        entry.degree = degreeLine.trim();
      }
    }

    // University — line that doesn't look like a date/degree
    const uniLine = lines.find(
      (l) =>
        l !== degreeLine &&
        !DEGREE_KEYWORDS.some((kw) => new RegExp(`\\b${kw}`, "i").test(l)) &&
        !/\d{4}/.test(l) &&
        l.length > 5
    );
    if (uniLine) entry.university = uniLine;

    // Date range
    const dateLine = lines.find((l) => /\d{4}/.test(l));
    if (dateLine) {
      const { start, end } = parseDateRange(dateLine);
      entry.start_date = start;
      entry.end_date = end;
    }

    if (entry.degree || entry.university) {
      results.push(entry);
    }
  }

  return results;
}

// ── work experience ───────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship", "Remote", "Hybrid"];

function parseWorkExperience(text: string): ParsedWorkExperience[] {
  const section = extractSection(
    text,
    "work experience",
    "professional experience",
    "employment history",
    "experience",
    "career history"
  );
  if (!section) return [];

  const blocks = section
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const results: ParsedWorkExperience[] = [];

  for (const block of blocks) {
    if (block.length < 10) continue;
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const entry: ParsedWorkExperience = {};

    // First line often "Job Title @ Company" or "Job Title | Company" or "Job Title – Company"
    const titleLine = lines[0];
    const splitMatch = titleLine.match(/^(.+?)\s*[@|·•—–\-]\s*(.+)$/);
    if (splitMatch) {
      entry.job_title = splitMatch[1].trim();
      entry.company = splitMatch[2].trim();
    } else {
      entry.job_title = titleLine;
      // Second line might be company
      if (lines[1] && !/\d{4}/.test(lines[1]) && lines[1].length < 60) {
        entry.company = lines[1];
      }
    }

    // Employment type
    const empLine = lines.find((l) =>
      EMPLOYMENT_TYPES.some((et) => new RegExp(`\\b${et}\\b`, "i").test(l))
    );
    if (empLine) {
      const etMatch = EMPLOYMENT_TYPES.find((et) =>
        new RegExp(`\\b${et}\\b`, "i").test(empLine)
      );
      if (etMatch) entry.employment_type = etMatch;
    }

    // Date range
    const dateLine = lines.find((l) => /\d{4}/.test(l));
    if (dateLine) {
      const { start, end } = parseDateRange(dateLine);
      entry.start_date = start;
      entry.end_date = end;
    }

    // Location — line with city/country-like pattern, no date
    const locationLine = lines.find(
      (l) =>
        l !== titleLine &&
        l !== dateLine &&
        /,/.test(l) &&
        !/\d{4}/.test(l) &&
        l.length < 50
    );
    if (locationLine && locationLine !== entry.company) {
      entry.location = locationLine;
    }

    // Description — bullet lines or longer lines
    const descLines = lines.filter(
      (l) =>
        l !== titleLine &&
        l !== dateLine &&
        l !== entry.company &&
        l !== entry.location &&
        l !== empLine
    );
    if (descLines.length) {
      entry.description = descLines.join("\n");
    }

    if (entry.job_title) results.push(entry);
  }

  return results;
}

// ── summary ───────────────────────────────────────────────────────────────────

function parseSummary(text: string): string {
  return (
    extractSection(text, "summary", "professional summary", "profile", "objective", "about me") ||
    ""
  );
}

// ── name (heuristic: first non-contact line) ─────────────────────────────────

function extractName(text: string): string | undefined {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    // Skip lines that look like contact info
    if (/@|http|linkedin|github|\+?\d[\d\s\-().]{6,}/i.test(line)) continue;
    // Skip lines that look like section headers
    if (/^(resume|cv|curriculum vitae|contact|email|phone|address)/i.test(line)) continue;
    // Looks like a name: 2–4 words, reasonable length
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 5 && line.length < 60) {
      return line;
    }
  }
  return undefined;
}

function extractLocation(text: string): string | undefined {
  // Try to find city, state/country pattern near top of resume
  const lines = text.split("\n").slice(0, 15);
  for (const line of lines) {
    if (/@|http/i.test(line)) continue;
    const m = line.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,}(?:\s+\d{5})?)/);
    if (m) return m[1].trim();
  }
  return undefined;
}

// ── JSON resume (jsonresume.org standard) ────────────────────────────────────

// Using Record<string, unknown> to avoid 'any' — we access fields with optional chaining
type JsonObj = Record<string, unknown>;

function g(obj: unknown, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = (obj as JsonObj)?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function gs(obj: unknown, ...keys: string[]): string | undefined {
  const v = g(obj, ...keys);
  return typeof v === "string" ? v : undefined;
}

function parseJsonResume(obj: JsonObj): ParsedProfile {
  const basics: unknown = (obj.basics ?? obj);
  const locationRaw = (basics as JsonObj)?.location;
  const locationStr =
    typeof locationRaw === "string"
      ? locationRaw
      : gs(locationRaw, "city")
      ? `${gs(locationRaw, "city")}${gs(locationRaw, "region") ? ", " + gs(locationRaw, "region") : ""}`
      : undefined;

  const profiles = (basics as JsonObj)?.profiles;
  const profileArr = Array.isArray(profiles) ? (profiles as JsonObj[]) : [];
  const linkedinUrl = profileArr.find((p) => /linkedin/i.test(gs(p, "network") ?? ""))?.url as string | undefined;
  const githubUrl   = profileArr.find((p) => /github/i.test(gs(p, "network") ?? ""))?.url as string | undefined;

  const profile: ParsedProfile = {
    full_name: gs(basics, "name", "full_name"),
    email:     gs(basics, "email"),
    phone:     gs(basics, "phone", "phone_number"),
    location:  locationStr,
    linkedin:  linkedinUrl ?? gs(basics, "linkedin", "linkedin_url"),
    github:    githubUrl   ?? gs(basics, "github", "github_url"),
    summary:   gs(basics, "summary", "headline"),
    job_category: gs(basics, "job_category", "label"),
  };

  // education
  if (Array.isArray(obj.education)) {
    profile.education = (obj.education as JsonObj[]).map((e) => ({
      university:    gs(e, "institution", "university"),
      degree:        gs(e, "studyType", "degree"),
      field_of_study: gs(e, "area", "field_of_study"),
      start_date:    gs(e, "startDate") ? normaliseDate(gs(e, "startDate") as string) : undefined,
      end_date:      gs(e, "endDate")   ? normaliseDate(gs(e, "endDate") as string)   : undefined,
      location:      gs(e, "location"),
    }));
  }

  // work
  const workRaw = obj.work ?? obj.work_experience ?? obj.experience ?? [];
  if (Array.isArray(workRaw)) {
    profile.work_experience = (workRaw as JsonObj[]).map((w) => ({
      job_title:       gs(w, "position", "job_title", "title"),
      company:         gs(w, "name", "company"),
      employment_type: gs(w, "employment_type"),
      location:        gs(w, "location"),
      start_date:      gs(w, "startDate") ? normaliseDate(gs(w, "startDate") as string) : undefined,
      end_date:        gs(w, "endDate")   ? normaliseDate(gs(w, "endDate") as string)   : undefined,
      description:     Array.isArray(w.highlights)
        ? (w.highlights as string[]).join("\n")
        : gs(w, "summary", "description"),
    }));
  }

  return profile;
}

// ── main export ───────────────────────────────────────────────────────────────

export function parseResumeText(text: string): ParsedProfile {
  return {
    full_name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(text),
    linkedin: extractLinkedIn(text),
    github: extractGitHub(text),
    summary: parseSummary(text),
    education: parseEducation(text),
    work_experience: parseWorkExperience(text),
  };
}

export function parseResumeJson(jsonText: string): ParsedProfile {
  try {
    const obj = JSON.parse(jsonText);
    return parseJsonResume(obj);
  } catch {
    // Fallback: treat as plain text
    return parseResumeText(jsonText);
  }
}
