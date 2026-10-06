import type { Metadata } from "next";

const description = "Create an HHQ account for your team and start generating tailored resumes and cover letters from any job description.";

export const metadata: Metadata = {
  title: "Create an Account - AI Resume Generator",
  description,
  alternates: { canonical: "/register" },
  openGraph: { title: "Create an Account - AI Resume Generator | HHQ", description, url: "/register" },
  twitter: { title: "Create an Account - AI Resume Generator | HHQ", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
