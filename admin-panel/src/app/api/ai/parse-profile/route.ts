import { NextRequest, NextResponse } from "next/server";

interface ParsedEducation {
  university?: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
}

interface ParsedWork {
  job_title?: string;
  company?: string;
  employment_type?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

interface ParsedProfile {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  job_category?: string;
  education?: ParsedEducation[];
  work_experience?: ParsedWork[];
}

function cleanJsonPayload(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function toMonth(value?: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}$/.test(value)) return value;

  const ymd = value.match(/(\d{4})-(\d{2})-\d{2}/);
  if (ymd) return `${ymd[1]}-${ymd[2]}`;

  const mmYYYY = value.match(/(\d{1,2})\/(\d{4})/);
  if (mmYYYY) return `${mmYYYY[2]}-${String(mmYYYY[1]).padStart(2, "0")}`;

  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const my = value.match(/([a-z]{3,9})\.?\s*,?\s*(\d{4})/i);
  if (my) {
    const m = months[my[1].slice(0, 3).toLowerCase()];
    if (m) return `${my[2]}-${m}`;
  }

  const year = value.match(/(\d{4})/);
  if (year) return `${year[1]}-01`;

  return "";
}

function normalizeProfile(input: ParsedProfile): ParsedProfile {
  const education = Array.isArray(input.education) ? input.education : [];
  const work = Array.isArray(input.work_experience) ? input.work_experience : [];

  const normalizedEducation = education
    .map((entry) => ({
      university: entry.university?.trim() || "",
      degree: entry.degree?.trim() || "General Studies",
      field_of_study: entry.field_of_study?.trim() || "General",
      start_date: toMonth(entry.start_date) || "2000-01",
      end_date: toMonth(entry.end_date) || "",
      location: entry.location?.trim() || "",
    }))
    .filter((entry) => entry.degree || entry.field_of_study);

  const normalizedWork = work
    .map((entry) => ({
      job_title: entry.job_title?.trim() || "Professional",
      company: entry.company?.trim() || "",
      employment_type: entry.employment_type?.trim() || "",
      location: entry.location?.trim() || "",
      start_date: toMonth(entry.start_date) || "2000-01",
      end_date: toMonth(entry.end_date) || "",
      description: entry.description?.trim() || "",
    }))
    .filter((entry) => entry.job_title);

  return {
    full_name: input.full_name?.trim() || "Unknown Candidate",
    email: input.email?.trim() || `unknown+${Date.now()}@example.com`,
    phone: input.phone?.trim() || "",
    location: input.location?.trim() || "",
    linkedin: input.linkedin?.trim() || "",
    github: input.github?.trim() || "",
    summary: input.summary?.trim() || "",
    job_category: input.job_category?.trim() || "",
    education: normalizedEducation.length
      ? normalizedEducation
      : [
          {
            university: "",
            degree: "General Studies",
            field_of_study: "General",
            start_date: "2000-01",
            end_date: "",
            location: "",
          },
        ],
    work_experience: normalizedWork.length
      ? normalizedWork
      : [
          {
            job_title: "Professional",
            company: "",
            employment_type: "",
            location: "",
            start_date: "2000-01",
            end_date: "",
            description: "",
          },
        ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    console.log("Starting resume parse with", text.length, "chars");

    const systemPrompt = `You are a resume-to-JSON extraction engine.
Extract profile details from plain resume text and return strict JSON only.`;

    const userPrompt = `Extract and return exactly this JSON structure:
{
  "full_name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "github": "",
  "summary": "",
  "job_category": "",
  "education": [
    {
      "university": "",
      "degree": "",
      "field_of_study": "",
      "start_date": "",
      "end_date": "",
      "location": ""
    }
  ],
  "work_experience": [
    {
      "job_title": "",
      "company": "",
      "employment_type": "",
      "location": "",
      "start_date": "",
      "end_date": "",
      "description": ""
    }
  ]
}

Rules:
- Return valid JSON only, no markdown.
- If unknown, return empty string.
- Keep dates as text if uncertain.
- Keep arrays empty if no data.

Resume text:
${text.slice(0, 20000)}`;

    // Use Xano's Claude integration (which has working API key)
    const xanoResponse = await fetch("https://x8ki-letl-twmt.n7.xano.io/api:caf8Eo15:v1/resume/parse-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
      }),
    });

    console.log("Xano API response status:", xanoResponse.status);

    if (!xanoResponse.ok) {
      const errText = await xanoResponse.text();
      console.error("Xano API error:", errText);
      return NextResponse.json({ error: "AI request failed", details: errText }, { status: 502 });
    }

    const result = await xanoResponse.json();
    const rawText = result?.ai_response || result?.response || result?.text;

    if (typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });
    }

    let parsed: ParsedProfile;
    try {
      parsed = JSON.parse(cleanJsonPayload(rawText));
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON", raw: rawText }, { status: 502 });
    }

    const normalized = normalizeProfile(parsed);
    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error("Parse endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to parse resume", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
