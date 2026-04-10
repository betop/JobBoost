"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { userService, type UserType } from "@/services/userService";
import { profileService } from "@/services/profileService";
import { useUIStore } from "@/store/uiStore";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { ArrowLeft } from "lucide-react";

const userSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    type: z.enum(["bidder", "admin"] as const),
    password: z.string().optional(),
    profile_ids: z.array(z.string()).optional(),
    is_active: z.boolean(),
  })
  .refine(
    (data) => data.type !== "admin" || (data.password && data.password.length >= 8),
    { message: "Password must be at least 8 characters for admin users", path: ["password"] }
  );

type UserFormData = z.infer<typeof userSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: profileService.getAll,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { type: "bidder", is_active: true, profile_ids: [] },
  });

  const selectedType = watch("type");

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) =>
      userService.create({
        full_name: data.full_name,
        email: data.email,
        type: data.type as UserType,
        password: data.password,
        profile_ids: data.profile_ids ?? [],
        is_active: data.is_active,
      }),
    onSuccess: () => {
      showToast("User created successfully", "success");
      router.push("/dashboard/users");
    },
    onError: () => {
      showToast("Failed to create user", "error");
    },
  });

  const onSubmit = (data: UserFormData) => {
    createMutation.mutate(data);
  };

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/users")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6 max-w-2xl"
      >
        {/* Role selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            {(["bidder", "admin"] as const).map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  value={t}
                  className="w-4 h-4 text-primary-600"
                  {...register("type")}
                />
                <span className="text-sm font-medium text-gray-800 capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            error={errors.full_name?.message}
            {...register("full_name")}
            required
          />
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register("email")}
            required
          />
        </div>

        {/* Password — required for admin */}
        <Input
          label={`Password${selectedType === "admin" ? " *" : " (optional)"}`}
          type="password"
          error={errors.password?.message}
          {...register("password")}
          required={selectedType === "admin"}
        />

        {/* Profiles — only relevant for bidders */}
        {selectedType === "bidder" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Profiles{" "}
              <span className="text-gray-400 font-normal">(select one or more)</span>
            </label>
            <Controller
              name="profile_ids"
              control={control}
              render={({ field }) => (
                <div className="space-y-2 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {profiles.length === 0 && (
                    <p className="text-sm text-gray-400">No profiles available</p>
                  )}
                  {profiles.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded border-gray-300"
                        checked={(field.value ?? []).includes(p.id)}
                        onChange={(e) => {
                          const current = field.value ?? [];
                          field.onChange(
                            e.target.checked
                              ? [...current, p.id]
                              : current.filter((id) => id !== p.id)
                          );
                        }}
                      />
                      <span className="text-sm text-gray-800">{p.full_name}</span>
                      {p.email && (
                        <span className="text-xs text-gray-400">{p.email}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            id="is_active"
            type="checkbox"
            className="w-4 h-4 text-primary-600 rounded border-gray-300"
            {...register("is_active")}
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Active Account
          </label>
        </div>

        <div className="flex gap-4 pt-2">
          <Button type="submit" loading={createMutation.isPending}>
            Create User
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard/users")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
