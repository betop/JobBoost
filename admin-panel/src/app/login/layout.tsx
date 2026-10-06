import type { Metadata } from "next";

const description = "Sign in to HHQ to manage candidate profiles and generate tailored, ATS-friendly resumes and cover letters with the AI resume generator.";

export const metadata: Metadata = {
  title: "Sign in to the AI Resume Builder",
  description,
  alternates: { canonical: "/login" },
  openGraph: { title: "Sign in to the AI Resume Builder | HHQ", description, url: "/login" },
  twitter: { title: "Sign in to the AI Resume Builder | HHQ", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
