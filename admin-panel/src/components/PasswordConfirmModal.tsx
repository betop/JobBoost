"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import api from "@/services/api";

const schema = z.object({
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
}

export default function PasswordConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Password",
  description = "Enter your password to continue",
}: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const admin = useAuthStore((s) => s.admin);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleClose = () => {
    reset();
    setShowPassword(false);
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    if (!admin?.email) {
      showToast("Admin email not found", "error");
      return;
    }

    setIsVerifying(true);
    try {
      // Verify password by attempting login with current email and provided password
      await api.post("/auth/verify-password", {
        email: admin.email,
        password: data.password,
      });

      showToast("Password confirmed", "success");
      await onConfirm();
      handleClose();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Invalid password";
      showToast(message, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm" closeOnBackdrop={false}>
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
        <p className="text-sm text-gray-600">{description}</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="w-full pr-10 pl-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              placeholder="Enter your password"
              disabled={isVerifying}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              disabled={isVerifying}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isVerifying}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isVerifying}
            className="flex-1"
          >
            {isVerifying ? "Verifying..." : "Confirm"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
