/**
 * Resume section / item visibility preferences stored on profile.resume_sections.
 *
 * Keys and defaults MUST match functions/resume/resolve_section_preferences.xs, which applies them
 * server-side after generation (apply_section_preferences). Missing keys fall back to these defaults,
 * so a profile saved before this feature keeps producing the same resume.
 */

export type ResumeSectionKey =
  | "name" | "headline" | "location" | "email" | "phone" | "linkedin" | "github"
  | "summary"
  | "work_experience" | "work_position_title" | "work_company_name" | "work_location" | "work_date" | "work_bullets"
  | "education" | "edu_university_name" | "edu_degree" | "edu_field_of_study" | "edu_location" | "edu_date"
  | "edu_highlights" | "edu_relevant_coursework"
  | "certifications" | "cert_name" | "cert_issuer" | "cert_date" | "cert_link"
  | "portfolio_projects" | "leadership" | "technical_skills" | "languages";

export type ResumeSections = Record<ResumeSectionKey, boolean>;

export interface SectionItem {
  key: ResumeSectionKey;
  label: string;
  hint?: string;
  recommended?: boolean;
  default: boolean;
}

export interface SectionGroup {
  /** Section toggle; undefined for the always-present header group */
  key?: ResumeSectionKey;
  label: string;
  description?: string;
  recommended?: boolean;
  default?: boolean;
  items: SectionItem[];
}

export const RESUME_SECTION_GROUPS: SectionGroup[] = [
  {
    label: "Header & contact",
    description: "Shown at the top of the resume. Values come from the Profile Info tab.",
    items: [
      { key: "name", label: "Full name", recommended: true, default: true },
      { key: "headline", label: "Position title headline", hint: "Professional title under the name", default: false },
      { key: "location", label: "Location", recommended: true, default: true },
      { key: "email", label: "Email address", recommended: true, default: true },
      { key: "phone", label: "Phone number", recommended: true, default: true },
      { key: "linkedin", label: "LinkedIn", recommended: true, default: true },
      { key: "github", label: "GitHub", default: false },
    ],
  },
  {
    key: "summary",
    label: "Professional summary",
    description: "2-3 sentence summary tailored to each job description.",
    default: false,
    items: [],
  },
  {
    key: "work_experience",
    label: "Work experience",
    recommended: true,
    default: true,
    items: [
      { key: "work_position_title", label: "Position title", recommended: true, default: true },
      { key: "work_company_name", label: "Company name", recommended: true, default: true },
      { key: "work_location", label: "Work location", default: true },
      { key: "work_date", label: "Dates (e.g. Jun 2025 - Present)", recommended: true, default: true },
      { key: "work_bullets", label: "Achievement bullets", recommended: true, default: true },
    ],
  },
  {
    key: "education",
    label: "Education",
    recommended: true,
    default: true,
    items: [
      { key: "edu_university_name", label: "University name", recommended: true, default: true },
      { key: "edu_degree", label: "Degree", recommended: true, default: true },
      { key: "edu_field_of_study", label: "Field of study", recommended: true, default: true },
      { key: "edu_date", label: "Graduation date (e.g. May 2018)", recommended: true, default: true },
      {
        key: "edu_location",
        label: "University location",
        hint: "Only shown when the profile and the education entry both have a location",
        default: true,
      },
      { key: "edu_highlights", label: "Honors & activities", default: true },
      { key: "edu_relevant_coursework", label: "Relevant coursework", default: true },
    ],
  },
  {
    key: "certifications",
    label: "Certifications",
    description: "Uses the certifications entered on the Profile Info tab; when there are none, suggests relevant ones.",
    default: true,
    items: [
      { key: "cert_name", label: "Certification name", recommended: true, default: true },
      { key: "cert_issuer", label: "Provider / issuer", recommended: true, default: true },
      { key: "cert_date", label: "Date (e.g. Jun 2024)", default: true },
      { key: "cert_link", label: "Credential link", default: true },
    ],
  },
  { key: "portfolio_projects", label: "Key projects", default: true, items: [] },
  { key: "leadership", label: "Leadership / entrepreneurial experience", default: true, items: [] },
  {
    key: "technical_skills",
    label: "Technical skills",
    description: "Never includes spoken languages like English or Spanish.",
    recommended: true,
    default: true,
    items: [],
  },
  {
    key: "languages",
    label: "Languages",
    description: "Spoken languages from the Profile Info tab (e.g. English (Native), Spanish (Professional)).",
    default: false,
    items: [],
  },
];

export const DEFAULT_RESUME_SECTIONS: ResumeSections = RESUME_SECTION_GROUPS.reduce((acc, g) => {
  if (g.key) acc[g.key] = g.default ?? true;
  g.items.forEach((i) => { acc[i.key] = i.default; });
  return acc;
}, {} as ResumeSections);

/** Same resolution as the backend: defaults, then legacy include_* flags, then stored booleans. */
export function resolveResumeSections(profile?: {
  resume_sections?: Partial<Record<string, unknown>> | string | null;
  include_certifications?: boolean | null;
  include_key_projects?: boolean | null;
} | null): ResumeSections {
  const out: ResumeSections = { ...DEFAULT_RESUME_SECTIONS };
  if (!profile) return out;
  if (profile.include_certifications === false) out.certifications = false;
  if (profile.include_key_projects === false) out.portfolio_projects = false;
  let stored = profile.resume_sections;
  if (typeof stored === "string") {
    try { stored = JSON.parse(stored); } catch { stored = null; }
  }
  if (stored && typeof stored === "object") {
    (Object.keys(out) as ResumeSectionKey[]).forEach((k) => {
      const v = (stored as Record<string, unknown>)[k];
      if (typeof v === "boolean") out[k] = v;
    });
  }
  return out;
}
