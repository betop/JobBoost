import type { Metadata } from "next";

const title = "Download the Resume Generator Chrome Extension & Gmail Job Tracker";
const description =
  "Download SwiftCV, the resume builder Chrome extension that tailors a resume and cover letter to a job description, and Mail Triage for Gmail job emails.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/download" },
  openGraph: { title, description, url: "/download" },
  twitter: { title, description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
