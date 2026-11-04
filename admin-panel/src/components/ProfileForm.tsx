"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Profile, type CreateProfileInput } from "@/services/profileService";
import { templateVisibilityService } from "@/services/templateVisibilityService";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import BillingAdminSelect from "@/components/BillingAdminSelect";
import AiModelSelect from "@/components/AiModelSelect";
import CertificationFields from "@/components/CertificationFields";
import Input from "@/components/Input";
import MultiSelect from "@/components/MultiSelect";
import Button from "@/components/Button";
import JobCategoryInput from "@/components/JobCategoryInput";
import ResumeAutofill from "@/components/ResumeAutofill";
import TemplatePicker from "@/components/TemplatePicker";
import ResumeTemplatePreview from "@/components/ResumeTemplatePreview";
import {
  RESUME_SECTION_GROUPS,
  BULLET_COUNT_FIELDS,
  BULLET_MIN,
  BULLET_MAX,
  clampBullets,
  resolveResumeSections,
  type ResumeSectionKey,
  type ResumeSections,
} from "@/utils/resumeSections";
import { Plus, Trash2, User, LayoutTemplate } from "lucide-react";

/**
 * The one profile form used by both the create and the edit page, so they always offer the same
 * features. Two tabs: "Profile info" (candidate data + generation settings) and "Resume template"
 * (visual template + which sections/items appear on the resume).
 */

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "German", "Portuguese", "Italian",
  "Dutch", "Polish", "Russian", "Ukrainian", "Turkish", "Arabic",
  "Hindi", "Chinese", "Japanese", "Korean", "Vietnamese", "Thai",
  "Indonesian", "Swedish", "Norwegian", "Danish", "Finnish", "Greek",
  "Czech", "Romanian", "Hungarian", "Hebrew",
].map((l) => ({ value: l, label: l }));

const educationSchema = z.object({
  id: z.string().optional(),
  university: z.string().optional(),
  degree: z.string().min(1, "Degree is required"),
  field_of_study: z.string().min(1, "Field of study is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  location: z.string().optional(),
});

const workExperienceSchema = z.object({
  id: z.string().optional(),
  job_title: z.string().min(1, "Position title is required"),
  company: z.string().optional(),
  employment_type: z.string().optional(),
  location: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  is_current: z.boolean().optional().default(false),
});

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  github: z.string().url("Invalid URL").optional().or(z.literal("")),
  job_category: z.string().optional(),
  resume_template: z.number().int().min(1).max(20).optional().default(11),
  education: z.array(educationSchema).min(1, "At least one education entry is required"),
  work_experience: z.array(workExperienceSchema).min(1, "At least one work experience is required"),
  include_achievements: z.boolean().optional().default(true),
  use_legacy_api: z.boolean().optional().default(false),
  block_lead_roles: z.boolean().optional().default(false),
  tailor_job_title: z.boolean().optional().default(true),
  allowed_languages: z.string().optional().default("English"),
  spoken_languages: z.string().optional().default(""),
  ai_model: z.string().optional().default("claude-haiku-4-5"),
  certifications: z.array(z.object({ name: z.string().optional(), issuer: z.string().optional(), date: z.string().optional(), url: z.string().optional() })).optional().default([]),
  default_compensation: z.string().optional(),
  resume_sections: z.record(z.string(), z.union([z.boolean(), z.number()])),
});

type ProfileFormData = z.infer<typeof profileSchema>;

/** Payload sent to POST /profiles or PUT /profiles/:id */
export type ProfileFormPayload = CreateProfileInput & { clear_certifications?: boolean };

interface ProfileFormProps {
  mode: "create" | "edit";
  profile?: Profile;
  submitting: boolean;
  onSubmit: (payload: ProfileFormPayload) => void;
  onCancel: () => void;
}

type Tab = "info" | "template";

// Xano returns dates as "YYYY-MM-DD"; <input type="month"> needs "YYYY-MM"
const toMonth = (v?: string) => (v ? v.slice(0, 7) : "");

const checkboxClass = "h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-40";

function RecommendedBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
      Recommended
    </span>
  );
}

function defaultValuesFor(profile?: Profile): ProfileFormData {
  const sections = resolveResumeSections(profile);
  if (!profile) {
    return {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      job_category: "",
      resume_template: 11,
      education: [{ degree: "", field_of_study: "", start_date: "" }],
      work_experience: [{ job_title: "", start_date: "", is_current: false }],
      include_achievements: true,
      use_legacy_api: false,
      block_lead_roles: false,
      tailor_job_title: true,
      allowed_languages: "English",
      spoken_languages: "",
      ai_model: "claude-haiku-4-5",
      certifications: [],
      default_compensation: "",
      resume_sections: sections,
    };
  }
  return {
    full_name: profile.full_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    linkedin: profile.linkedin ?? "",
    github: profile.github ?? "",
    job_category: profile.job_category ?? "",
    resume_template: profile.resume_template ?? 11,
    include_achievements: profile.include_achievements ?? false,
    use_legacy_api: profile.use_legacy_api ?? false,
    block_lead_roles: profile.block_lead_roles ?? false,
    tailor_job_title: profile.tailor_job_title ?? true,
    allowed_languages: profile.allowed_languages ?? "English",
    spoken_languages: profile.spoken_languages ?? "",
    ai_model: profile.ai_model ?? "claude-haiku-4-5",
    certifications: (profile.certifications ?? []).map((c) => ({ name: c.name, issuer: c.issuer ?? "", date: c.date ?? "", url: c.url ?? "" })),
    default_compensation: profile.default_compensation ?? "",
    resume_sections: sections,
    education: profile.education?.length
      ? profile.education.map((e) => ({ ...e, start_date: toMonth(e.start_date), end_date: toMonth(e.end_date) }))
      : [{ degree: "", field_of_study: "", start_date: "" }],
    work_experience: profile.work_experience?.length
      ? profile.work_experience.map((w) => ({
          ...w,
          start_date: toMonth(w.start_date),
          end_date: toMonth(w.end_date),
          is_current: w.is_current ?? false,
        }))
      : [{ job_title: "", start_date: "", is_current: false }],
  };
}

export default function ProfileForm({ mode, profile, submitting, onSubmit, onCancel }: ProfileFormProps) {
  const showToast = useUIStore((state) => state.showToast);
  const isSuperAdmin = useAuthStore((state) => state.admin?.type) === "super_admin";
  const initialBillingAdminId = profile?.billing_admin_id ?? "";
  const [billingAdminId, setBillingAdminId] = useState(initialBillingAdminId);
  const [billingAdminError, setBillingAdminError] = useState("");
  const [tab, setTab] = useState<Tab>("info");

  const { data: templateVisibility } = useQuery({
    queryKey: ["template-visibility"],
    queryFn: templateVisibilityService.get,
    staleTime: 60_000,
  });
  const allowedTemplateIds = isSuperAdmin ? undefined : templateVisibility?.admin_visible_template_ids;

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultValuesFor(profile),
  });

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({ control, name: "education" });
  const { fields: workFields, append: appendWork, remove: removeWork } = useFieldArray({ control, name: "work_experience" });

  const sections = watch("resume_sections") as ResumeSections;
  const setSection = (key: ResumeSectionKey, value: boolean) =>
    setValue(`resume_sections.${key}`, value, { shouldDirty: true });
  const templateId = watch("resume_template") ?? 11;

  /** Merge parsed resume data into the candidate fields only (no auto-save; settings are kept) */
  function handleAutofill(data: CreateProfileInput) {
    const current = getValues();
    reset({
      ...current,
      full_name: data.full_name || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
      linkedin: data.linkedin || "",
      github: data.github || "",
      job_category: data.job_category || current.job_category || "",
      education: Array.isArray(data.education) && data.education.length
        ? data.education
        : [{ degree: "", field_of_study: "", start_date: "" }],
      work_experience: Array.isArray(data.work_experience) && data.work_experience.length
        ? data.work_experience.map((w) => ({ ...w, is_current: w.is_current ?? (!w.end_date) }))
        : [{ job_title: "", start_date: "", is_current: false }],
    });
    setTab("info");
    showToast(
      `Profile form auto-filled. Review and click ${mode === "create" ? "Create Profile" : "Save Changes"} to save.`,
      "success",
    );
  }

  const onValid = (data: ProfileFormData) => {
    if (isSuperAdmin && !billingAdminId) {
      setBillingAdminError("Billing admin is required");
      setTab("info");
      return;
    }
    const certifications = (data.certifications ?? [])
      .filter((c) => (c.name ?? "").trim() !== "")
      .map((c) => ({ name: (c.name ?? "").trim(), issuer: c.issuer, date: c.date, url: (c.url ?? "").trim() || undefined }));
    const resumeSections = data.resume_sections as ResumeSections;

    const payload: ProfileFormPayload = {
      ...data,
      resume_sections: resumeSections,
      spoken_languages: (data.spoken_languages ?? "").trim(),
      // Legacy flags kept in sync with the section checkboxes (the legacy generation API reads them)
      include_certifications: resumeSections.certifications,
      include_key_projects: resumeSections.portfolio_projects,
      certifications,
      resume_template: data.resume_template ?? 11,
      linkedin: data.linkedin || undefined,
      github: data.github || undefined,
      phone: data.phone || undefined,
      location: data.location || undefined,
      job_category: data.job_category || undefined,
    };
    if (mode === "edit") {
      // An empty list is an explicit "remove all" (clear_certifications), not "leave unchanged"
      payload.clear_certifications = certifications.length === 0;
      if (isSuperAdmin && billingAdminId !== initialBillingAdminId) payload.billing_admin_id = billingAdminId;
    } else if (isSuperAdmin) {
      payload.billing_admin_id = billingAdminId;
    }
    onSubmit(payload);
  };

  const onInvalid = (errs: FieldErrors<ProfileFormData>) => {
    // Every validated field lives on the Profile info tab
    if (Object.keys(errs).some((k) => k !== "resume_template" && k !== "resume_sections")) setTab("info");
    showToast("Please fix the highlighted fields.", "error");
  };

  const submitLabel = mode === "create" ? "Create Profile" : "Save Changes";

  const tabButton = (id: Tab, label: string, Icon: typeof User) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        tab === id ? "border-primary-600 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="sticky top-16 z-20 -mx-6 -mt-6 mb-6 px-6 pt-3 bg-white/95 backdrop-blur border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between gap-3">
          <div role="tablist" className="flex gap-1">
            {tabButton("info", "Profile info", User)}
            {tabButton("template", "Resume template", LayoutTemplate)}
          </div>
          <div className="flex items-center gap-3 pb-3">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" loading={submitting}>{submitLabel}</Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ Profile info tab ═══════════════════════ */}
      <div className={tab === "info" ? "space-y-8" : "hidden"}>
        <ResumeAutofill onParsed={handleAutofill} />

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" error={errors.full_name?.message} {...register("full_name")} required />
            <Input label="Email" type="email" error={errors.email?.message} {...register("email")} required />
            <Input label="Phone" type="tel" error={errors.phone?.message} {...register("phone")} />
            <Input label="Location" error={errors.location?.message} {...register("location")} />
            <Input label="LinkedIn URL" error={errors.linkedin?.message} {...register("linkedin")} />
            <Input label="GitHub URL" error={errors.github?.message} {...register("github")} />
          </div>
          {isSuperAdmin ? (
            <div className="mt-4 md:w-1/2">
              <BillingAdminSelect
                value={billingAdminId}
                onChange={(v) => {
                  setBillingAdminId(v);
                  setBillingAdminError("");
                }}
                error={billingAdminError}
                current={profile ? { id: profile.billing_admin_id, name: profile.billing_admin_name } : undefined}
              />
            </div>
          ) : profile?.billing_admin_name ? (
            <div className="mt-4">
              <p className="block text-sm font-medium text-gray-700 mb-1">Billing admin</p>
              <p className="text-sm text-gray-900">{profile.billing_admin_name}</p>
            </div>
          ) : null}
          <div className="mt-4">
            <Controller
              name="job_category"
              control={control}
              render={({ field }) => (
                <JobCategoryInput value={field.value ?? ""} onChange={field.onChange} error={errors.job_category?.message} />
              )}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Education</h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => appendEducation({ degree: "", field_of_study: "", start_date: "" })}>
              <Plus className="w-4 h-4" />
              Add Education
            </Button>
          </div>
          {errors.education && typeof errors.education === "object" && "message" in errors.education && (
            <p className="text-sm text-red-600 mb-2">{errors.education.message}</p>
          )}
          <div className="space-y-4">
            {educationFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4 relative">
                {educationFields.length > 1 && (
                  <button type="button" onClick={() => removeEducation(index)} className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-50 rounded" aria-label="Remove education">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="University" error={errors.education?.[index]?.university?.message} {...register(`education.${index}.university`)} />
                  <Input label="Degree" error={errors.education?.[index]?.degree?.message} {...register(`education.${index}.degree`)} required />
                  <Input label="Field of Study" error={errors.education?.[index]?.field_of_study?.message} {...register(`education.${index}.field_of_study`)} required />
                  <Input label="Location" error={errors.education?.[index]?.location?.message} {...register(`education.${index}.location`)} />
                  <Input label="Start Date" type="month" error={errors.education?.[index]?.start_date?.message} {...register(`education.${index}.start_date`)} required />
                  <Input label="End Date" type="month" error={errors.education?.[index]?.end_date?.message} {...register(`education.${index}.end_date`)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Work Experience</h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => appendWork({ job_title: "", start_date: "", is_current: false })}>
              <Plus className="w-4 h-4" />
              Add Experience
            </Button>
          </div>
          {errors.work_experience && typeof errors.work_experience === "object" && "message" in errors.work_experience && (
            <p className="text-sm text-red-600 mb-2">{errors.work_experience.message}</p>
          )}
          <div className="space-y-4">
            {workFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4 relative">
                {workFields.length > 1 && (
                  <button type="button" onClick={() => removeWork(index)} className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-50 rounded" aria-label="Remove experience">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Position Title" error={errors.work_experience?.[index]?.job_title?.message} {...register(`work_experience.${index}.job_title`)} required />
                  <Input label="Company" error={errors.work_experience?.[index]?.company?.message} {...register(`work_experience.${index}.company`)} />
                  <Input label="Employment Type" error={errors.work_experience?.[index]?.employment_type?.message} {...register(`work_experience.${index}.employment_type`)} />
                  <Input label="Location" error={errors.work_experience?.[index]?.location?.message} {...register(`work_experience.${index}.location`)} />
                  <Controller
                    control={control}
                    name={`work_experience.${index}.is_current`}
                    render={({ field: currentField }) => (
                      <div className="md:col-span-2 flex flex-col gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                          <input type="checkbox" checked={currentField.value ?? false} onChange={(e) => currentField.onChange(e.target.checked)} className={checkboxClass} />
                          Current position
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input label="Start Date" type="month" error={errors.work_experience?.[index]?.start_date?.message} {...register(`work_experience.${index}.start_date`)} required />
                          {!currentField.value && (
                            <Input label="End Date" type="month" error={errors.work_experience?.[index]?.end_date?.message} {...register(`work_experience.${index}.end_date`)} />
                          )}
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <CertificationFields control={control} register={register} />

        {/* Spoken Languages (resume Languages section) */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Spoken Languages</h2>
          <p className="text-sm text-gray-500 mb-4">
            Shown in the resume&apos;s Languages section when it is enabled on the Resume template tab. Spoken languages never appear under technical skills.
          </p>
          <Input
            label="Languages"
            placeholder="e.g. English (Native), Spanish (Professional)"
            error={errors.spoken_languages?.message}
            {...register("spoken_languages")}
          />
        </div>

        {/* Title Tailoring */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Position Title Tailoring</h2>
          <p className="text-sm text-gray-500 mb-4">When enabled, the header title and current position title are reworded to match the target job description (e.g. &quot;Backend Engineer&quot; → &quot;Senior Backend Engineer&quot;). Disable to always use the exact title from the profile.</p>
          <Controller
            name="tailor_job_title"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input type="checkbox" checked={field.value ?? true} onChange={(e) => field.onChange(e.target.checked)} className={checkboxClass} />
                Tailor position title to match the job description
              </label>
            )}
          />
        </div>

        {/* AI Model */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">AI Model</h2>
          <p className="text-sm text-gray-500 mb-4">The Claude model used to generate resumes, cover letters and chat answers for this profile. Applies to everyone who generates with this profile.</p>
          <Controller name="ai_model" control={control} render={({ field }) => <AiModelSelect value={field.value} onChange={field.onChange} />} />
        </div>

        {/* Job Filtering */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Job Filtering</h2>
          <p className="text-sm text-gray-500 mb-4">Control which jobs this profile is allowed to generate a resume for.</p>
          <Controller
            name="block_lead_roles"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input type="checkbox" checked={field.value ?? false} onChange={(e) => field.onChange(e.target.checked)} className={checkboxClass} />
                Block lead-level and architect roles (don&apos;t generate a resume for jobs classified as &quot;lead&quot; seniority or with &quot;architect&quot; in the title)
              </label>
            )}
          />
        </div>

        {/* Allowed Languages */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Allowed Job Languages</h2>
          <p className="text-sm text-gray-500 mb-4">Languages this profile accepts job descriptions in. Jobs written in any other language will be rejected. Default: English.</p>
          <Controller
            name="allowed_languages"
            control={control}
            render={({ field }) => (
              <MultiSelect
                placeholder="Select allowed languages"
                options={LANGUAGE_OPTIONS}
                selected={field.value ? field.value.split(",").map((v) => v.trim()).filter(Boolean) : []}
                onChange={(values) => field.onChange(values.join(", "))}
              />
            )}
          />
        </div>

        {/* Compensation */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Compensation</h2>
          <p className="text-sm text-gray-500 mb-4">Shown in the chat bubble when a job description doesn&apos;t mention a salary or pay range.</p>
          <Input label="Default compensation" placeholder="e.g. $120K - $150K/yr" error={errors.default_compensation?.message} {...register("default_compensation")} />
        </div>

        {/* API Mode */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Generation API</h2>
          <p className="text-sm text-gray-500 mb-4">Use the legacy resume generation API for this profile instead of the current one.</p>
          <Controller
            name="use_legacy_api"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input type="checkbox" checked={field.value ?? false} onChange={(e) => field.onChange(e.target.checked)} className={checkboxClass} />
                Use legacy API
              </label>
            )}
          />
        </div>
      </div>

      {/* ═══════════════════════ Resume template tab ═══════════════════════ */}
      <div className={tab === "template" ? "space-y-8" : "hidden"}>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Resume Template</h2>
          <p className="text-sm text-gray-500 mb-4">Choose the visual layout used when generating the PDF resume. Every template shows every section enabled below.</p>
          <Controller
            name="resume_template"
            control={control}
            render={({ field }) => (
              <TemplatePicker value={field.value ?? 11} onChange={field.onChange} allowedTemplateIds={allowedTemplateIds} />
            )}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(380px,46%)] gap-6 items-start">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Resume Sections</h2>
              <p className="text-sm text-gray-500">Choose which sections and items appear on this profile&apos;s resumes. Items marked <RecommendedBadge /> are checked by default.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setValue("resume_sections", resolveResumeSections(null), { shouldDirty: true })}
            >
              Reset to defaults
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4">
            {RESUME_SECTION_GROUPS.map((group) => {
              const sectionOn = group.key ? sections?.[group.key] ?? false : true;
              return (
                <div key={group.label} className={`border rounded-lg p-4 ${sectionOn ? "border-gray-200" : "border-gray-100 bg-gray-50"}`}>
                  {group.key ? (
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sectionOn}
                        onChange={(e) => setSection(group.key as ResumeSectionKey, e.target.checked)}
                        className={checkboxClass}
                      />
                      {group.label}
                      {group.recommended && <RecommendedBadge />}
                    </label>
                  ) : (
                    <p className="text-sm font-semibold text-gray-900">{group.label}</p>
                  )}
                  {group.description && <p className="text-xs text-gray-500 mt-1 ml-6">{group.description}</p>}
                  {group.items.length > 0 && (
                    <div className="mt-3 ml-6 flex flex-col gap-2">
                      {group.items.map((item) => (
                        <label
                          key={item.key}
                          className={`flex items-start gap-2 text-sm select-none ${sectionOn ? "text-gray-700 cursor-pointer" : "text-gray-400 cursor-not-allowed"}`}
                        >
                          <input
                            type="checkbox"
                            disabled={!sectionOn}
                            checked={sections?.[item.key] ?? false}
                            onChange={(e) => setSection(item.key, e.target.checked)}
                            className={`${checkboxClass} mt-0.5`}
                          />
                          <span>
                            {item.label}
                            {item.recommended && <RecommendedBadge />}
                            {item.hint && <span className="block text-xs text-gray-400">{item.hint}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {group.key === "work_experience" && (
                    <div className="mt-4 ml-6">
                      <p className="text-xs font-medium text-gray-700 mb-2">Bullets per position</p>
                      <div className="grid grid-cols-3 gap-2">
                        {BULLET_COUNT_FIELDS.map((f) => (
                          <label key={f.key} className="text-xs text-gray-600" title={f.hint}>
                            <span className="block mb-1">{f.label}</span>
                            <input
                              type="number"
                              min={BULLET_MIN}
                              max={BULLET_MAX}
                              disabled={!sectionOn || !sections?.work_bullets}
                              value={(sections?.[f.key] as number | undefined) ?? f.default}
                              onChange={(e) =>
                                setValue(`resume_sections.${f.key}`, clampBullets(e.target.value, f.default), { shouldDirty: true })
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-400"
                            />
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Internships are included only when total work experience is 5 years or less.</p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="border border-gray-200 rounded-lg p-4">
              <Controller
                name="include_achievements"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 cursor-pointer select-none">
                    <input type="checkbox" checked={field.value ?? false} onChange={(e) => field.onChange(e.target.checked)} className={checkboxClass} />
                    Awards &amp; recognition
                  </label>
                )}
              />
              <p className="text-xs text-gray-500 mt-1 ml-6">Only used by the legacy generation API.</p>
            </div>
          </div>
        </div>

        <div className="xl:sticky xl:top-32">
          <ResumeTemplatePreview templateId={templateId} sections={sections} />
        </div>
        </div>
      </div>
    </form>
  );
}
