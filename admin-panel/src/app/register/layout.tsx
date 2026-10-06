import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create account", description: "Create an HHQ account.", alternates: { canonical: "/register" }, openGraph: { title: "Create account | HHQ", url: "/register" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
