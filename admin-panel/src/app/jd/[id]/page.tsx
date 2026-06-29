import { Briefcase, Building2, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

const XANO_PUBLIC_BASE = "https://api.shsws-solutions.com/api:W5ffWHW-";

interface JDData {
  id: string;
  position_title?: string;
  company_name?: string;
  job_url?: string;
  job_description?: string;
  seniority?: string;
  tech_scope?: string;
  created_at?: number;
}

async function fetchJD(id: string): Promise<JDData | null> {
  try {
    const res = await fetch(`${XANO_PUBLIC_BASE}/public/jd/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDate(ts?: number) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

export default async function PublicJDPage({ params }: { params: { id: string } }) {
  const data = await fetchJD(params.id);
  if (!data) notFound();

  const content = data.job_description || "";
  const html = isHtml(content);
  const date = formatDate(data.created_at);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-500 tracking-wide">Job Description</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {data.position_title && (
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                  {data.position_title}
                </h1>
              )}
              {data.company_name && (
                <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                  <Building2 className="w-4 h-4" />
                  {data.company_name}
                </div>
              )}
            </div>
            {data.job_url && (
              <a
                href={data.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                View original posting
              </a>
            )}
          </div>

          {(data.seniority || data.tech_scope || date) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {data.seniority && (
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                  {data.seniority}
                </span>
              )}
              {data.tech_scope && (
                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">
                  {data.tech_scope}
                </span>
              )}
              {date && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                  {date}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Job description */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-6">
          {content ? (
            html ? (
              <div
                className="jd-content"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {content}
              </pre>
            )
          ) : (
            <p className="text-sm text-gray-400 italic">No job description available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const data = await fetchJD(params.id);
  if (!data) return { title: "Job Description Not Found" };
  const title = [data.position_title, data.company_name].filter(Boolean).join(" — ");
  return {
    title: title || "Job Description",
    description: data.company_name
      ? `${data.position_title} at ${data.company_name}`
      : data.position_title || "Job description",
  };
}
