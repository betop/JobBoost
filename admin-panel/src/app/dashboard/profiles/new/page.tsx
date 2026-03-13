"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";
import { useUIStore } from "@/store/uiStore";
import Input from "@/components/Input";
import Button from "@/components/Button";
import JobCategoryInput from "@/components/JobCategoryInput";
import ResumeAutofill from "@/components/ResumeAutofill";
import type { CreateProfileInput } from "@/services/profileService";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const educationSchema = z.object({
  university: z.string().optional(),
  degree: z.string().min(1, "Degree is required"),
  field_of_study: z.string().min(1, "Field of study is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  location: z.string().optional(),
});

const workExperienceSchema = z.object({
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
  education: z.array(educationSchema).min(1, "At least one education entry is required"),
  work_experience: z.array(workExperienceSchema).min(1, "At least one work experience is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function NewProfilePage() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    // controller used for JobCategoryInput
    resolver: zodResolver(profileSchema),
    defaultValues: {
      education: [{ degree: "", field_of_study: "", start_date: "" }],
      work_experience: [{ job_title: "", start_date: "" }],
    },
  });

  /** Merge parsed resume data into the form only (no auto-save) */
  function handleAutofill(parsed: CreateProfileInput) {
    populateFormFromAI(parsed);
    showToast("Profile form auto-filled. Review and click Create Profile to save.", "success");
  }

  function populateFormFromAI(data: CreateProfileInput) {
    reset({
      full_name: data.full_name || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
      linkedin: data.linkedin || "",
      github: data.github || "",
      job_category: data.job_category || "",
      education: Array.isArray(data.education) && data.education.length ? data.education : [{ degree: "", field_of_study: "", start_date: "" }],
      work_experience: Array.isArray(data.work_experience) && data.work_experience.length ? data.work_experience : [{ job_title: "", start_date: "" }],
    });
  }

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

  const createMutation = useMutation({
    mutationFn: profileService.create,
    onSuccess: () => {
      showToast("Profile created successfully", "success");
      router.push("/dashboard/profiles");
    },
    onError: () => {
      showToast("Profile creation failed. Please review form data and try again.", "error");
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
    };
    createMutation.mutate(payload);
  };

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/profiles")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
        {/* ── Autofill ── */}
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
                  <Input
                    label="University"
                    error={errors.education?.[index]?.university?.message}
                    {...register(`education.${index}.university`)}
                  />
                  <Input
                    label="Degree"
                    error={errors.education?.[index]?.degree?.message}
                    {...register(`education.${index}.degree`)}
                    required
                  />
                  <Input
                    label="Field of Study"
                    error={errors.education?.[index]?.field_of_study?.message}
                    {...register(`education.${index}.field_of_study`)}
                    required
                  />
                  <Input
                    label="Location"
                    error={errors.education?.[index]?.location?.message}
                    {...register(`education.${index}.location`)}
                  />
                  <Input
                    label="Start Date"
                    type="month"
                    error={errors.education?.[index]?.start_date?.message}
                    {...register(`education.${index}.start_date`)}
                    required
                  />
                  <Input
                    label="End Date"
                    type="month"
                    error={errors.education?.[index]?.end_date?.message}
                    {...register(`education.${index}.end_date`)}
                  />
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
                  <Input
                    label="Job Title"
                    error={errors.work_experience?.[index]?.job_title?.message}
                    {...register(`work_experience.${index}.job_title`)}
                    required
                  />
                  <Input
                    label="Company"
                    error={errors.work_experience?.[index]?.company?.message}
                    {...register(`work_experience.${index}.company`)}
                  />
                  <Input
                    label="Employment Type"
                    error={errors.work_experience?.[index]?.employment_type?.message}
                    {...register(`work_experience.${index}.employment_type`)}
                  />
                  <Input
                    label="Location"
                    error={errors.work_experience?.[index]?.location?.message}
                    {...register(`work_experience.${index}.location`)}
                  />
                  <Input
                    label="Start Date"
                    type="month"
                    error={errors.work_experience?.[index]?.start_date?.message}
                    {...register(`work_experience.${index}.start_date`)}
                    required
                  />
                  <Input
                    label="End Date"
                    type="month"
                    error={errors.work_experience?.[index]?.end_date?.message}
                    {...register(`work_experience.${index}.end_date`)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" loading={createMutation.isPending}>
            Create Profile
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/profiles")}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
