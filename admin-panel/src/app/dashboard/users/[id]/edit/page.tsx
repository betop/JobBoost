"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { userService, type UserType } from "@/services/userService";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import Input from "@/components/Input";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft } from "lucide-react";

const userSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  type: z.enum(["bidder", "admin"] as const),
  profile_ids: z.array(z.string()).optional(),
  assigned_bidder_ids: z.array(z.string()).optional(),
  is_active: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const currentAdmin = useAuthStore((state) => state.admin);
  const isSuperAdmin = currentAdmin?.type === "super_admin";
  const id = params.id as string;

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => userService.getById(id),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: profileService.getAll,
  });

  // Fetch all bidders — used by super_admin to assign bidders to admins
  const { data: allBidders = [] } = useQuery({
    queryKey: ["users", "bidder"],
    queryFn: () => userService.getAll("bidder"),
    enabled: isSuperAdmin,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { type: "bidder", is_active: true, profile_ids: [], assigned_bidder_ids: [] },
  });

  const selectedType = watch("type");

  useEffect(() => {
    if (user) {
      reset({
        full_name: user.full_name,
        email: user.email,
        type: user.type === "super_admin" ? "admin" : user.type,
        profile_ids: user.profile_ids ?? [],
        assigned_bidder_ids: user.assigned_bidder_ids ?? [],
        is_active: user.is_active,
      });
    }
  }, [user, reset]);

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: UserFormData) =>
      userService.update(id, {
        full_name: data.full_name,
        email: data.email,
        type: isSuperAdmin ? (data.type as UserType) : (user!.type as UserType),
        profile_ids: data.profile_ids ?? [],
        assigned_bidder_ids: data.type === "admin" ? (data.assigned_bidder_ids ?? []) : undefined,
        is_active: data.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("User updated successfully", "success");
      router.push("/dashboard/users");
    },
    onError: () => {
      showToast("Failed to update user", "error");
    },
  });

  const onSubmit = (data: UserFormData) => {
    updateMutation.mutate(data);
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/users")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
          <p className="text-gray-500 text-sm mt-1">{user.email}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6 max-w-2xl"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
          {isSuperAdmin ? (
            <div className="flex gap-4">
              {(["bidder", "admin"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={t}
                    className="w-4 h-4 text-primary-600"
                    {...register("type")}
                  />
                  <span className="text-sm font-medium text-gray-800 capitalize">
                    {t}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700 capitalize">
              {user.type}
            </span>
          )}
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

        {/* Assign Profiles — for both bidders and admins */}
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
                            : current.filter((pid) => pid !== p.id)
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

        {/* Assign Bidders — only shown for admin users, only by super_admin */}
        {isSuperAdmin && selectedType === "admin" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Bidders{" "}
              <span className="text-gray-400 font-normal">(select one or more)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Selected bidders will be visible to this admin in their Users page.
            </p>
            <Controller
              name="assigned_bidder_ids"
              control={control}
              render={({ field }) => (
                <div className="space-y-2 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {allBidders.length === 0 && (
                    <p className="text-sm text-gray-400">No bidders available</p>
                  )}
                  {allBidders.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded border-gray-300"
                        checked={(field.value ?? []).includes(b.id)}
                        onChange={(e) => {
                          const current = field.value ?? [];
                          field.onChange(
                            e.target.checked
                              ? [...current, b.id]
                              : current.filter((bid) => bid !== b.id)
                          );
                        }}
                      />
                      <span className="text-sm text-gray-800">{b.full_name}</span>
                      {b.email && (
                        <span className="text-xs text-gray-400">{b.email}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <input
                id="is_active"
                type="checkbox"
                className="w-4 h-4 text-primary-600 rounded border-gray-300"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Active Account
          </label>
        </div>

        <div className="flex gap-4 pt-2">
          <Button type="submit" loading={updateMutation.isPending}>
            Save Changes
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

