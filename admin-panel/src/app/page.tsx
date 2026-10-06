import Link from "next/link";
import {
  FileText,
  MessageSquare,
  Mail,
  Users,
  ArrowRight,
  Download,
  LayoutTemplate,
  Chrome,
} from "lucide-react";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_FEATURES } from "./site";

// Runs before the splash paints: signed-in visitors go straight to the dashboard.
const REDIRECT_SCRIPT = `(function(){try{var t=localStorage.getItem("admin_token");var s=localStorage.getItem("admin-auth");var a=s&&JSON.parse(s).state&&JSON.parse(s).state.isAuthenticated===true;if(t&&a){document.documentElement.style.visibility="hidden";window.location.replace("/dashboard");}}catch(e){}})();`;

const features = [
  {
    icon: FileText,
    title: "AI resume generator and cover letter generator",
    text: "Paste a job description and get a tailored resume and a matching cover letter for the selected candidate profile.",
  },
  {
    icon: LayoutTemplate,
    title: "20 resume templates, ATS-friendly PDF and Word",
    text: "Pick a resume template per profile and export an ATS-compliant PDF, or download the resume as a Word (.docx) file.",
  },
  {
    icon: Chrome,
    title: "Resume builder Chrome extension",
    text: "SwiftCV runs in your browser: select the job description on any job page and generate from the right-click menu.",
  },
  {
    icon: Mail,
    title: "Gmail job application tracker",
    text: "Mail Triage classifies job-related emails (application, assessment, interview, offer, rejection) and labels them in Gmail.",
  },
  {
    icon: MessageSquare,
    title: "AI assistant chat",
    text: "Ask the in-extension assistant for help with a role or an application, using the context of your latest generation.",
  },
  {
    icon: Users,
    title: "Team profiles, roles and usage tracking",
    text: "Admins manage candidate profiles, access keys with IP whitelist, credits and generation logs.",
  },
];

const steps = [
  { title: "Set up candidate profiles", text: "Admins store each candidate's details, work history and preferred resume template." },
  { title: "Issue an access key", text: "Give each team member a key for the extension, optionally limited to approved IP addresses." },
  { title: "Select a job description", text: "Highlight the job posting text on any page and choose Generate Resume and Cover Letter." },
  { title: "Download your resume and cover letter", text: "The tailored resume and cover letter are created as PDFs, and the resume is also available as Word." },
];

const faqs = [
  {
    q: "What is an ATS-friendly resume?",
    a: "An ATS-friendly resume is formatted so applicant tracking systems can read it: clear sections, real text instead of images, and a simple layout. HHQ's PDF generator is built to produce ATS-compliant resumes, and you can also download the resume as a Word file.",
  },
  {
    q: "How does the AI resume generator tailor a resume to a job description?",
    a: "You select the job description text in the SwiftCV Chrome extension. The AI reads it together with the chosen candidate profile and rewrites the resume content to match the role, then renders it in the profile's resume template.",
  },
  {
    q: "Does it write cover letters?",
    a: "Yes. Each run creates a cover letter alongside the tailored resume, both saved as PDF files. Admin keys can switch to resume-only generation.",
  },
  {
    q: "Which resume templates are available?",
    a: "SwiftCV includes 20 resume templates. Each candidate profile has its own template, and super admins can choose which templates admins are allowed to pick.",
  },
  {
    q: "How does Mail Triage track job applications in Gmail?",
    a: "The Mail Triage Chrome extension reads your Gmail messages, uses AI to classify job-related emails by stage (application, assessment, interview, offer, rejection and more), and applies Gmail labels so you can see where each application stands.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, publisher: { "@id": `${SITE_URL}/#organization` } },
    {
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": `${SITE_URL}/#app`,
      name: `${SITE_NAME} - AI Resume Generator`,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Chrome",
      featureList: SITE_FEATURES,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
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
          <nav aria-label="Main" className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link href="/download" className="text-gray-600 hover:text-gray-900 px-2">
              Download extensions
            </Link>
            <Link href="/login" className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">
              Sign in
            </Link>
          </nav>
        </header>

        <main>
        <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-100">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-200/50 blur-3xl"
          />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
            <h1 id="hero-heading" className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900">
              AI Resume Generator &amp; <span className="text-primary-600">ATS Resume Builder</span> for Teams
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Paste a job description and get a tailored, ATS-friendly resume and cover letter as PDF or Word, right
              from your browser. Manage candidate profiles and track job emails in Gmail.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 shadow-sm"
              >
                Sign in to HHQ <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-white border border-gray-300 font-semibold text-gray-800 hover:bg-gray-50"
              >
                Create an account
              </Link>
              <Link
                href="/download"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-primary-700 font-semibold hover:bg-primary-100"
              >
                <Download className="w-4 h-4" /> Get the resume builder extension
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <h2 id="features-heading" className="text-3xl font-bold text-center">Resume generator, cover letter generator and job tracker in one platform</h2>
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

        <section aria-labelledby="how-heading" className="bg-gray-50 border-y border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <h2 id="how-heading" className="text-3xl font-bold text-center">How to create a tailored resume for a job description</h2>
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

        <section aria-labelledby="faq-heading" className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
          <h2 id="faq-heading" className="text-3xl font-bold text-center">Frequently asked questions</h2>
          <div className="mt-10 space-y-8">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-lg">{f.q}</h3>
                <p className="mt-2 text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-gray-600">
            Ready to start? <Link href="/download" className="text-primary-700 font-medium hover:underline">Download the resume generator Chrome extension and Gmail job tracker</Link>.
          </p>
        </section>
        </main>

        <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} HHQ - AI resume generator for teams. All rights reserved.</p>
          <nav aria-label="Footer" className="flex gap-5">
            <Link href="/login" className="hover:text-gray-900">Sign in</Link>
            <Link href="/register" className="hover:text-gray-900">Create an account</Link>
            <Link href="/download" className="hover:text-gray-900">Download extensions</Link>
          </nav>
        </footer>
      </div>
    </>
  );
}
