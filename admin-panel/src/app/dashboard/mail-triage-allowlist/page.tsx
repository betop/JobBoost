"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MailTriageAllowlistRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/mail-triage"); }, [router]);
  return null;
}
