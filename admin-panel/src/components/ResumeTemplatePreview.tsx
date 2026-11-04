"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { renderResumePreviewUrl } from "@/utils/pdfDownload";
import type { ResumeSections } from "@/utils/resumeSections";

/**
 * Live PDF preview of the selected template with "John Doe" sample data, rendered by the same
 * swiftcv generator the extension uses. Section/item checkboxes and bullet counts are applied to the
 * sample the same way the server applies them to a generated resume (apply_section_preferences).
 */

const BULLETS = [
  "Built an event-driven order pipeline on AWS Lambda and SQS, cutting checkout latency 38% for 2M monthly users.",
  "Led migration of 40 REST services to GraphQL federation, reducing client payload size 45%.",
  "Introduced contract testing with Pact across 12 teams, lowering integration defects 30%.",
  "Optimized PostgreSQL queries and indexes, trimming p95 API response time from 420ms to 180ms.",
  "Mentored 4 engineers through code reviews and pairing, raising sprint throughput 20%.",
  "Automated blue-green deployments with Terraform and GitHub Actions, enabling 15 releases per week.",
  "Designed a feature-flag service adopted by 9 product squads, shortening rollout cycles 50%.",
  "Instrumented services with OpenTelemetry, reducing mean time to resolution 35%.",
  "Partnered with product and design to ship a one-click reorder flow, lifting repeat purchases 12%.",
  "Hardened authentication with OAuth 2.0 and short-lived tokens, closing 14 audit findings.",
];

const SAMPLE = {
  header: {
    name: "JOHN DOE",
    title: "Senior Software Engineer",
    location: "Austin, TX",
    email: "john.doe@example.com",
    phone: "(555) 123-4567",
    linkedin: { display: "in/johndoe", url: "https://www.linkedin.com/in/johndoe" },
    github: { display: "github.com/johndoe", url: "https://github.com/johndoe" },
  },
  summary:
    "Software engineer with 4+ years building scalable cloud services and APIs for e-commerce platforms, focused on performance, reliability and developer productivity.",
  career_breakdowns: [
    { company: "Acme Commerce", title: "Senior Software Engineer", date_range: "Jan 2024 - Present", location: "Austin, TX", bullets: BULLETS, kind: "current" },
    { company: "Globex Systems", title: "Software Engineer", date_range: "Sep 2022 - Dec 2023", location: "Remote", bullets: [...BULLETS].reverse(), kind: "former" },
    { company: "Initech", title: "Software Engineering Intern", date_range: "May 2022 - Aug 2022", location: "Dallas, TX", bullets: BULLETS.slice(2), kind: "internship" },
  ],
  education: [
    {
      institution: "University of Texas at Austin",
      degree: "BACHELOR OF SCIENCE",
      major: "Computer Science",
      location: "Austin, TX",
      year: "May 2022",
      highlights: "Dean's List, ACM Chapter Officer",
      Relevant: "Distributed Systems, Databases, Algorithms",
    },
  ],
  certifications: [
    { name: "AWS Certified Developer - Associate", issuer: "Amazon Web Services", date: "Jun 2024", url: "https://www.credly.com/badges/example" },
  ],
  portfolio_projects: [
    { name: "Inventory Forecasting Service (Python, FastAPI)", description: "Developed a demand forecasting API that reduced stockouts 22% across 300 SKUs." },
  ],
  leadership_enterpreneurial_experience: [
    { name: "Platform Reliability Guild", role: "Organizer", description: "Organized a cross-team guild that standardized on-call runbooks for 6 services." },
  ],
  technical_skills: {
    programming: "TypeScript, Python, Go, SQL",
    softwares: "AWS, Terraform, Docker, Kubernetes, PostgreSQL",
    project_management: "Agile, Scrum, Jira",
  },
  languages: ["English (Native)", "Spanish (Professional)"],
};

type Rec = Record<string, unknown>;

function applySections(s: ResumeSections): Rec {
  const r: Rec = JSON.parse(JSON.stringify(SAMPLE));
  const header = r.header as Rec;
  const headerMap: [keyof ResumeSections, string][] = [
    ["name", "name"], ["headline", "title"], ["location", "location"], ["email", "email"],
    ["phone", "phone"], ["linkedin", "linkedin"], ["github", "github"],
  ];
  headerMap.forEach(([pref, key]) => { if (!s[pref]) delete header[key]; });
  // The generator needs a name or summary to render; keep a placeholder name if both are hidden
  if (!header.name && !s.summary) header.name = " ";
  if (!s.summary) delete r.summary;

  if (!s.work_experience) {
    delete r.career_breakdowns;
  } else {
    r.career_breakdowns = (r.career_breakdowns as Rec[]).map((job) => {
      const j = { ...job };
      const limit = j.kind === "current" ? s.bullets_current : j.kind === "internship" ? s.bullets_internship : s.bullets_former;
      j.bullets = (j.bullets as string[]).slice(0, limit);
      delete j.kind;
      if (!s.work_position_title) delete j.title;
      if (!s.work_company_name) delete j.company;
      if (!s.work_location) delete j.location;
      if (!s.work_date) delete j.date_range;
      if (!s.work_bullets) delete j.bullets;
      return j;
    });
  }

  if (!s.education) {
    delete r.education;
  } else {
    r.education = (r.education as Rec[]).map((e) => {
      const x = { ...e };
      if (!s.edu_university_name) delete x.institution;
      if (!s.edu_degree) delete x.degree;
      if (!s.edu_field_of_study) delete x.major;
      if (!s.edu_location) delete x.location;
      if (!s.edu_date) delete x.year;
      if (!s.edu_highlights) delete x.highlights;
      if (!s.edu_relevant_coursework) delete x.Relevant;
      return x;
    });
  }

  if (!s.certifications) {
    delete r.certifications;
  } else {
    r.certifications = (r.certifications as Rec[]).map((c) => {
      const x = { ...c };
      if (!s.cert_name) delete x.name;
      if (!s.cert_issuer) delete x.issuer;
      if (!s.cert_date) delete x.date;
      if (!s.cert_link) delete x.url;
      return x;
    });
  }

  if (!s.portfolio_projects) delete r.portfolio_projects;
  if (!s.leadership) delete r.leadership_enterpreneurial_experience;
  if (!s.technical_skills) delete r.technical_skills;
  if (!s.languages) delete r.languages;
  return r;
}

export default function ResumeTemplatePreview({ templateId, sections }: { templateId: number; sections: ResumeSections }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const urlRef = useRef<string | null>(null);
  const key = JSON.stringify({ templateId, sections });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Debounce so clicking through checkboxes doesn't re-render the PDF on every click
    const t = setTimeout(async () => {
      try {
        const next = await renderResumePreviewUrl(applySections(sections), templateId);
        if (cancelled) { URL.revokeObjectURL(next); return; }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = next;
        setUrl(next);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Preview failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
        <p className="text-sm font-medium text-gray-900">Preview</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Sample data (John Doe)
        </div>
      </div>
      {error ? (
        <p className="p-4 text-sm text-red-600">Could not render preview: {error}</p>
      ) : url ? (
        <iframe
          title="Resume template preview"
          src={`${url}#toolbar=0&navpanes=0&view=FitH`}
          className="w-full bg-white"
          style={{ height: "min(1100px, 80vh)" }}
        />
      ) : (
        <div className="flex items-center justify-center text-sm text-gray-500" style={{ height: 400 }}>
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Rendering preview…
        </div>
      )}
    </div>
  );
}
