"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import { labelForCode } from "@/components/JobCategoryInput";
import { ArrowLeft, Edit, Mail, Phone, MapPin, Linkedin, Github } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";

const TEMPLATE_META_MAP: Record<number, { name: string; accent: string; dark: string; medium: string }> = {
  1: { name: "Classic Blue", accent: "#2563eb", dark: "#1e3a5f", medium: "#3b82f6" },
  2: { name: "Emerald Modern", accent: "#059669", dark: "#064e3b", medium: "#10b981" },
  3: { name: "Royal Purple", accent: "#7c3aed", dark: "#4c1d95", medium: "#8b5cf6" },
  4: { name: "Bold Red", accent: "#dc2626", dark: "#7f1d1d", medium: "#ef4444" },
  5: { name: "Sky Blue", accent: "#0284c7", dark: "#0c4a6e", medium: "#0ea5e9" },
  6: { name: "Amber Warm", accent: "#b45309", dark: "#78350f", medium: "#d97706" },
  7: { name: "Teal Minimal", accent: "#0f766e", dark: "#134e4a", medium: "#14b8a6" },
  8: { name: "Indigo Sidebar", accent: "#4f46e5", dark: "#1e1b4b", medium: "#6366f1" },
  9: { name: "Rose Pink", accent: "#ec4899", dark: "#831843", medium: "#f472b6" },
  10: { name: "Slate Professional", accent: "#64748b", dark: "#1e293b", medium: "#94a3b8" },
  11: { name: "STAR Method Plain", accent: "#000000", dark: "#000000", medium: "#000000" },
};

function TemplateMiniPreview({ templateId }: { templateId: number }) {
  const template = TEMPLATE_META_MAP[templateId] ?? TEMPLATE_META_MAP[11];

  return (
    <div className="w-full max-w-[260px] rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      <div className="aspect-[3/4] rounded-md border border-gray-100 p-2">
        <div className="h-2 rounded-sm mb-1" style={{ background: template.dark, width: "60%" }} />
        <div className="h-1 rounded-sm mb-2" style={{ background: template.medium, width: "40%" }} />
        <div className="h-px mb-2" style={{ background: template.accent }} />
        <div className="h-1 rounded-sm mb-1" style={{ background: template.accent, width: "35%", opacity: 0.8 }} />
        {[90, 78, 84, 66].map((width, i) => (
          <div key={i} className="h-0.5 rounded-sm mb-1" style={{ background: "#d1d5db", width: `${width}%` }} />
        ))}
        <div className="h-1 rounded-sm mt-2 mb-1" style={{ background: template.accent, width: "40%", opacity: 0.8 }} />
        {[86, 72, 68].map((width, i) => (
          <div key={i} className="h-0.5 rounded-sm mb-1" style={{ background: "#d1d5db", width: `${width}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function ProfileViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard/profiles");
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: () => profileService.getById(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return <div>Profile not found</div>;
  }

  const jobCategoryTags = profile.job_category
    ? profile.job_category
        .split(",")
        .map((category) => category.trim())
        .filter(Boolean)
        .map((category) => labelForCode(category))
    : [];

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Profile Details</h1>
        <Button onClick={() => router.push(`/dashboard/profiles/${id}/edit`)}>
          <Edit className="w-5 h-5" />
          Edit Profile
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{profile.full_name}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="w-5 h-5" />
            <span>{profile.email}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="w-5 h-5" />
            <span>{profile.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-5 h-5" />
            <span>{profile.location || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Linkedin className="w-5 h-5" />
            {profile.linkedin ? (
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                LinkedIn Profile
              </a>
            ) : (
              <span>—</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Github className="w-5 h-5" />
            {profile.github ? (
              <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                GitHub Profile
              </a>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Education</h3>
              <div className="space-y-4">
                {profile.education.map((edu, index) => (
                  <div key={index} className="border-l-4 border-primary-500 pl-4">
                    <h4 className="font-semibold text-gray-900">{edu.degree} in {edu.field_of_study}</h4>
                    {edu.university && <p className="text-gray-700">{edu.university}</p>}
                    <p className="text-sm text-gray-600">
                      {formatDate(edu.start_date)} - {edu.end_date ? formatDate(edu.end_date) : "Present"}
                    </p>
                    {edu.location && <p className="text-sm text-gray-600">{edu.location}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Work Experience</h3>
              <div className="space-y-4">
                {profile.work_experience.map((exp, index) => (
                  <div key={index} className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold text-gray-900">{exp.job_title}</h4>
                    {exp.company && <p className="text-gray-700">{exp.company}</p>}
                    <p className="text-sm text-gray-600">
                      {formatDate(exp.start_date)} - {exp.is_current ? "Present" : formatDate(exp.end_date ?? "")}
                    </p>
                    {exp.employment_type && <p className="text-sm text-gray-600">{exp.employment_type}</p>}
                    {exp.location && <p className="text-sm text-gray-600">{exp.location}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Profile Configuration</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Approval Status</p>
                <span
                  className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    profile.is_approved
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {profile.is_approved ? "Approved" : "Pending"}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500">Job Category</p>
                {jobCategoryTags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {jobCategoryTags.map((category) => (
                      <span
                        key={category}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-900 font-medium">—</p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Resume Sections</p>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      profile.include_key_projects
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Key Projects: {profile.include_key_projects ? "On" : "Off"}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      profile.include_certifications
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Certifications: {profile.include_certifications ? "On" : "Off"}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      profile.include_achievements
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Awards & Recognition: {profile.include_achievements ? "On" : "Off"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Generation API</p>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    profile.use_legacy_api
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {profile.use_legacy_api ? "Legacy API" : "Current API"}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Default Compensation</p>
                <p className="text-gray-900 font-medium">
                  {profile.default_compensation || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Resume Template</p>
                <p className="text-gray-900 font-medium mb-2">
                  {TEMPLATE_META_MAP[profile.resume_template ?? 11]?.name ?? `Template ${profile.resume_template ?? 11}`}
                </p>
                <TemplateMiniPreview templateId={profile.resume_template ?? 11} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
