"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";
import { useUIStore } from "@/store/uiStore";
import Button from "@/components/Button";
import ProfileForm from "@/components/ProfileForm";
import { ArrowLeft } from "lucide-react";

export default function NewProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);

  const createMutation = useMutation({
    mutationFn: profileService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      showToast("Profile created successfully", "success");
      router.push("/dashboard/profiles");
    },
    onError: () => {
      showToast("Profile creation failed. Please review form data and try again.", "error");
    },
  });

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/profiles")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Profile</h1>
      </div>

      <ProfileForm
        mode="create"
        submitting={createMutation.isPending}
        onSubmit={(payload) => createMutation.mutate(payload)}
        onCancel={() => router.push("/dashboard/profiles")}
      />
    </>
  );
}
