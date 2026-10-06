import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to your HHQ account.", alternates: { canonical: "/login" }, openGraph: { title: "Sign in | HHQ", url: "/login" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
