"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { bidderService } from "@/services/bidderService";
import { profileService } from "@/services/profileService";
import { useUIStore } from "@/store/uiStore";
import Input from "@/components/Input";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

const bidderSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  profile_ids: z.array(z.string()).optional(),
  is_active: z.boolean(),
});

type BidderFormData = z.infer<typeof bidderSchema>;

export default function EditBidderPage() {
  const params = useParams();
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const id = params.id as string;

  const { data: bidder, isLoading: bidderLoading } = useQuery({
    queryKey: ["bidder", id],
    queryFn: () => bidderService.getById(id),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: profileService.getAll,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<BidderFormData>({
    resolver: zodResolver(bidderSchema),
    defaultValues: { is_active: true, profile_ids: [] },
  });

  useEffect(() => {
    if (bidder) {
      reset({
        full_name  : bidder.full_name,
        email      : bidder.email,
        profile_ids: bidder.profile_ids ?? [],
        is_active  : bidder.is_active,
      });
    }
  }, [bidder, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: BidderFormData) =>
      bidderService.update(id, {
        full_name  : data.full_name,
        email      : data.email,
        profile_ids: data.profile_ids ?? [],
        is_active  : data.is_active,
      }),
    onSuccess: () => {
      showToast("Bidder updated successfully", "success");
      router.push("/dashboard/bidders");
    },
    onError: () => {
      showToast("Failed to update bidder", "error");
    },
  });

  const onSubmit = (data: BidderFormData) => {
    updateMutation.mutate(data);
  };

  if (bidderLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!bidder) {
    return <div>Bidder not found</div>;
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/bidders")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Bidder</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6 max-w-2xl">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign Profiles <span className="text-gray-400 font-normal">(select one or more)</span>
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
                  <label key={p.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
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
                    {p.email && <span className="text-xs text-gray-400">{p.email}</span>}
                  </label>
                ))}
              </div>
            )}
          />
        </div>

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
          <Button type="submit" loading={updateMutation.isPending}>
            Save Changes
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/bidders")}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
