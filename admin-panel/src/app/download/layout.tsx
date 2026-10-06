import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download extensions",
  description: "Download the latest HHQ browser extensions: SwiftCV for AI resume generation and Mail Triage for Gmail.",
  alternates: { canonical: "/download" },
  openGraph: { title: "Download the HHQ extensions", url: "/download" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
