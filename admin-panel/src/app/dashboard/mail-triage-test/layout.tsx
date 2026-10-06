import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mail Triage test" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
