import Link from "next/link";
import {
  FileText,
  MessageSquare,
  Mail,
  KeyRound,
  Coins,
  Users,
  ArrowRight,
  Download,
} from "lucide-react";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "./site";

// Runs before the splash paints: signed-in visitors go straight to the dashboard.
const REDIRECT_SCRIPT = `(function(){try{var t=localStorage.getItem("admin_token");var s=localStorage.getItem("admin-auth");var a=s&&JSON.parse(s).state&&JSON.parse(s).state.isAuthenticated===true;if(t&&a){document.documentElement.style.visibility="hidden";window.location.replace("/dashboard");}}catch(e){}})();`;

const features = [
  {
    icon: FileText,
    title: "AI resumes and cover letters",
    text: "Generate tailored documents from a job description, per profile and template.",
  },
  {
    icon: MessageSquare,
    title: "Assistant chat",
    text: "Ask the assistant for help with a role, a profile or an application.",
  },
  {
    icon: Mail,
    title: "Gmail mail triage",
    text: "A Gmail extension that classifies job-related emails so nothing slips by.",
  },
  {
    icon: KeyRound,
    title: "Keys with IP whitelist",
    text: "Issue access keys for bidders and restrict them to approved IP addresses.",
  },
  {
    icon: Coins,
    title: "Credits and usage",
    text: "Pay-as-you-go crypto credits with generation logs to track usage.",
  },
  {
    icon: Users,
    title: "Team roles",
    text: "Admins and super admins manage profiles, bidders, rules and releases.",
  },
];

const steps = [
  { title: "Set up profiles", text: "Admins store candidate profiles and the rules that guide generation." },
  { title: "Issue a key", text: "Give each bidder a key, optionally limited to approved IPs." },
  { title: "Pick a job description", text: "Bidders select a job posting on any page with the SwiftCV extension." },
  { title: "Download your documents", text: "A tailored resume and cover letter are generated and saved as PDFs." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
    },
  ],
};

export default function Home() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: REDIRECT_SCRIPT }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-white text-gray-900">
        <header className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-5">
          <Link href="/" className="text-xl font-bold text-primary-700">
            HHQ
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link href="/download" className="text-gray-600 hover:text-gray-900 px-2">
              Download
            </Link>
            <Link href="/login" className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">
              Sign in
            </Link>
          </nav>
        </header>

        <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-100">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-200/50 blur-3xl"
          />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900">
              AI resume generation <span className="text-primary-600">for teams</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Manage candidate profiles and turn any job description into a tailored resume and cover letter, right
              from your browser.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 shadow-sm"
              >
                Sign in <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-white border border-gray-300 font-semibold text-gray-800 hover:bg-gray-50"
              >
                Register
              </Link>
              <Link
                href="/download"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-primary-700 font-semibold hover:bg-primary-100"
              >
                <Download className="w-4 h-4" /> Get the extension
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-3xl font-bold text-center">Everything your team needs</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 font-semibold text-lg">{title}</h3>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-50 border-y border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <h2 className="text-3xl font-bold text-center">How it works</h2>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.title} className="text-center sm:text-left">
                  <div className="mx-auto sm:mx-0 w-10 h-10 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} HHQ. All rights reserved.</p>
          <nav className="flex gap-5">
            <Link href="/login" className="hover:text-gray-900">Sign in</Link>
            <Link href="/register" className="hover:text-gray-900">Register</Link>
            <Link href="/download" className="hover:text-gray-900">Download</Link>
          </nav>
        </footer>
      </div>
    </>
  );
}
