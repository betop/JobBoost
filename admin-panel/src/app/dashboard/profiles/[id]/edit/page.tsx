"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";
import { useUIStore } from "@/store/uiStore";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProfileForm, { type ProfileFormPayload } from "@/components/ProfileForm";
import { ArrowLeft } from "lucide-react";

export default function EditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);
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

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormPayload) => profileService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", id] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      showToast("Profile updated successfully", "success");
      router.push(`/dashboard/profiles/${id}`);
    },
    onError: () => {
      showToast("Failed to update profile", "error");
    },
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
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
      </div>

      {/* Form mounts only once the profile is loaded so its default values are the saved ones */}
      <ProfileForm
        mode="edit"
        profile={profile}
        submitting={updateMutation.isPending}
        onSubmit={(payload) => updateMutation.mutate(payload)}
        onCancel={handleBack}
      />
    </>
  );
}
