"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAdmin = useAuthStore((state) => state.setAdmin);
  const showToast = useUIStore((state) => state.showToast);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const response = await authService.login(data);
      authService.setToken(response.token);
      setAdmin(response.admin);
      showToast("Login successful", "success");
      router.push("/dashboard");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Login failed";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              HHQ
            </h1>
            <p className="text-gray-600">Admin Login</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email"
              type="email"
              placeholder="admin@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            No account yet?{" "}
            <Link href="/register" className="text-primary-600 hover:underline font-medium">
              Create admin account
            </Link>
          </p>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          © 2026 HHQ. All rights reserved.
        </p>
      </div>
    </div>
  );
}
