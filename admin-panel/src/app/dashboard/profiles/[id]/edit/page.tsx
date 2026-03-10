"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { profileService, type Profile } from "@/services/profileService";
import { useUIStore } from "@/store/uiStore";
import Input from "@/components/Input";
import Button from "@/components/Button";
import JobCategoryInput from "@/components/JobCategoryInput";
import TemplatePicker from "@/components/TemplatePicker";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

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
  job_title: z.string().min(1, "Job title is required"),
  company: z.string().optional(),
  employment_type: z.string().optional(),
  location: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
});

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  github: z.string().url("Invalid URL").optional().or(z.literal("")),
  job_category: z.string().optional(),
  resume_template: z.number().int().min(1).max(10).optional().default(1),
  education: z.array(educationSchema).min(1, "At least one education entry is required"),
  work_experience: z.array(workExperienceSchema).min(1, "At least one work experience is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ─── Inner form — only rendered once profile data is available ───────────────

function EditProfileForm({ profile, id }: { profile: Profile; id: string }) {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);

  // Xano returns dates as "YYYY-MM-DD"; <input type="month"> needs "YYYY-MM"
  const toMonth = (v?: string) => (v ? v.slice(0, 7) : "");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      location: profile.location ?? "",
      linkedin: profile.linkedin ?? "",
      github: profile.github ?? "",
      job_category: profile.job_category ?? "",
      resume_template: profile.resume_template ?? 1,
      education: profile.education?.length
        ? profile.education.map((e) => ({
            ...e,
            start_date: toMonth(e.start_date),
            end_date: toMonth(e.end_date),
          }))
        : [{ degree: "", field_of_study: "", start_date: "" }],
      work_experience: profile.work_experience?.length
        ? profile.work_experience.map((w) => ({
            ...w,
            start_date: toMonth(w.start_date),
            end_date: toMonth(w.end_date),
          }))
        : [{ job_title: "", start_date: "" }],
    },
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({ control, name: "education" });

  const {
    fields: workFields,
    append: appendWork,
    remove: removeWork,
  } = useFieldArray({ control, name: "work_experience" });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) => profileService.update(id, data),
    onSuccess: () => {
      showToast("Profile updated successfully", "success");
      router.push(`/dashboard/profiles/${id}`);
    },
    onError: () => {
      showToast("Failed to update profile", "error");
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    const payload = {
      ...data,
      linkedin: data.linkedin || undefined,
      github: data.github || undefined,
      phone: data.phone || undefined,
      location: data.location || undefined,
      job_category: data.job_category || undefined,
      resume_template: data.resume_template ?? 1,
    };
    updateMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
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
        <div className="mt-4">
          <Controller
            name="job_category"
            control={control}
            render={({ field }) => (
              <JobCategoryInput
                value={field.value ?? ""}
                onChange={field.onChange}
                error={errors.job_category?.message}
              />
            )}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Education</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => appendEducation({ degree: "", field_of_study: "", start_date: "" })}
          >
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
                <button
                  type="button"
                  onClick={() => removeEducation(index)}
                  className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-50 rounded"
                >
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => appendWork({ job_title: "", start_date: "" })}
          >
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
                <button
                  type="button"
                  onClick={() => removeWork(index)}
                  className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Job Title" error={errors.work_experience?.[index]?.job_title?.message} {...register(`work_experience.${index}.job_title`)} required />
                <Input label="Company" error={errors.work_experience?.[index]?.company?.message} {...register(`work_experience.${index}.company`)} />
                <Input label="Employment Type" error={errors.work_experience?.[index]?.employment_type?.message} {...register(`work_experience.${index}.employment_type`)} />
                <Input label="Location" error={errors.work_experience?.[index]?.location?.message} {...register(`work_experience.${index}.location`)} />
                <Input label="Start Date" type="month" error={errors.work_experience?.[index]?.start_date?.message} {...register(`work_experience.${index}.start_date`)} required />
                <Input label="End Date" type="month" error={errors.work_experience?.[index]?.end_date?.message} {...register(`work_experience.${index}.end_date`)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resume Template */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Resume Template</h2>
        <p className="text-sm text-gray-500 mb-4">Choose the visual layout used when generating your PDF resume.</p>
        <Controller
          name="resume_template"
          control={control}
          render={({ field }) => (
            <TemplatePicker value={field.value ?? 1} onChange={field.onChange} />
          )}
        />
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" loading={updateMutation.isPending}>
          Save Changes
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/dashboard/profiles/${id}`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Page shell — handles loading/error, then mounts the form ────────────────

export default function EditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

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

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push(`/dashboard/profiles/${id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
      </div>

      <EditProfileForm profile={profile} id={id} />
    </>
  );
}
