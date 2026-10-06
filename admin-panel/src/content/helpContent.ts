// Help / Docs content for the admin panel. Edit this file to update the Help page.
//
// Role awareness:
//  - A section with `superOnly: true` is hidden from admins entirely.
//  - A bullet / FAQ item with `superOnly: true` is hidden from admins and shown with a
//    "Super admin" badge to super admins.

export type HelpGroup = "Overview" | "Admin panel" | "Extensions" | "Reference";

export interface HelpItem {
  text: string;
  superOnly?: boolean;
}

export interface HelpSection {
  id: string;
  title: string;
  group: HelpGroup;
  /** Route of the page this section documents (renders an "Open page" link). */
  route?: string;
  /** Link label override (default "Open page"). */
  routeLabel?: string;
  /** Open the link in a new tab (used for the public download page). */
  routeExternal?: boolean;
  superOnly?: boolean;
  purpose: string;
  features: HelpItem[];
  tips: HelpItem[];
  /** Extra words that should match the search box. */
  keywords?: string[];
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
  superOnly?: boolean;
}

export const HELP_GROUP_ORDER: HelpGroup[] = ["Overview", "Admin panel", "Extensions", "Reference"];

export const helpSections: HelpSection[] = [
  // ───────────────────────────── Overview ─────────────────────────────
  {
    id: "getting-started",
    title: "Getting started",
    group: "Overview",
    purpose:
      "A quick checklist for a new admin: from an empty account to a bidder generating their first resume.",
    features: [
      { text: "1. Add credit: open Credits and deposit by crypto (minimum $15). Generation stops when the balance reaches $0." },
      { text: "2. Create a profile: open Profiles, click create, and fill in the person's details, education, work experience, template and options." },
      { text: "3. Get the profile approved: profiles created by admins stay pending until a super admin approves them. Unapproved profiles cannot generate." },
      { text: "4. Create the bidder: open Users, add a user with the Bidder role and assign the profile(s) they will work with." },
      { text: "5. Request a key: open Keys and request a key for the bidder. A super admin reviews the request and generates the key (optionally with an expiry date and an IP whitelist)." },
      { text: "6. Share the extension: send the bidder the public Download page (/download) together with their key." },
      { text: "7. The bidder installs SwiftCV, enters the key, picks the profile and generates resumes from job descriptions." },
      { text: "8. Watch the results in Generation Logs and keep an eye on your balance in Credits." },
    ],
    tips: [
      { text: "Keep your balance above $5 to avoid the low-balance warning that bidders see." },
      { text: "A bidder that sees a blocked or error message in the extension can almost always be fixed from the FAQ at the end of this page." },
      { text: "Super admins also create admins, set the billing admin of each profile and manage extension releases." , superOnly: true },
    ],
    keywords: ["onboarding", "new", "setup", "checklist", "first steps"],
  },
  {
    id: "how-billing-works",
    title: "How billing works",
    group: "Overview",
    route: "/dashboard/credits",
    routeLabel: "Open Credits",
    purpose:
      "Every AI action (resume generation, the chat Assistant and Mail Triage) is paid from the credit balance of one admin, called the billing admin.",
    features: [
      { text: "Admins run on prepaid credit: you deposit crypto on the Credits page and each AI action deducts from your balance." },
      { text: "Who is billed: usage by a bidder is billed to the billing admin of the profile used. For profiles created by an admin the billing admin is that admin; for profiles created by a bidder it is the admin who created the bidder. Actions by an admin are billed to that admin." },
      { text: "Warning: when the billing admin's balance drops below $5, the extension shows a non-blocking low-credit notice and the Credits page shows a yellow banner. The action still completes." },
      { text: "Blocked: at $0 or below, new AI actions are refused with \"Insufficient credit\" until the billing admin tops up." },
      { text: "Mail Triage is billed to the billing admin of the profile whose email equals the Gmail address being triaged." },
      { text: "The sidebar shows your current balance next to Credits (yellow when low, red when negative)." },
      { text: "Usage is charged as the raw AI provider cost multiplied by a usage rate. The rate is set by a super admin on the Credits page (allowed range 1 to 10) and applies to every admin. Super admin accounts are not billed.", superOnly: true },
      { text: "Super admins can credit or debit an admin's balance manually (with a reason) from the Credits page.", superOnly: true },
    ],
    tips: [
      { text: "Deposits are processed through NOWPayments. The balance updates automatically once the payment is confirmed; there is nothing to click afterwards." },
      { text: "If several bidders share one billing admin, one empty balance blocks all of them." },
    ],
    keywords: ["credit", "balance", "billing admin", "payment", "cost", "low balance", "$5", "$0", "insufficient"],
  },

  // ───────────────────────────── Admin panel ─────────────────────────────
  {
    id: "dashboard",
    title: "Dashboard",
    group: "Admin panel",
    route: "/dashboard",
    purpose: "A 30-day overview of generations, spend and outcomes, plus shortcuts to common actions.",
    features: [
      { text: "KPI cards for generations (30 days) and active keys." },
      { text: "Admins also see their credit balance, spend (30 days), their number of profiles and their number of bidders." },
      { text: "Total profiles, pending approvals, admins and bidders counts, and admin spend (30 days).", superOnly: true },
      { text: "Spend by app (resume generations, Assistant, Mail Triage) for the last 30 days." },
      { text: "Generation outcomes for the last 30 days (matched, mismatched, skipped, duplicated, not a JD, reposted, error) with a link to the logs." },
      { text: "Admin balances panel, a banner when profiles are waiting for approval, and a banner when admins have low credit.", superOnly: true },
      { text: "Quick actions: create a profile, add a user, generate or request a key, view logs, add credit (admins) or manage credits and review pending profiles (super admins)." },
    ],
    tips: [
      { text: "Use the quick actions as your starting point; each one opens the matching page." },
    ],
    keywords: ["overview", "kpi", "stats", "home"],
  },
  {
    id: "profiles",
    title: "Profiles",
    group: "Admin panel",
    route: "/dashboard/profiles",
    purpose:
      "A profile is the professional identity a resume is generated for. This page lists profiles and lets you view, edit, duplicate, approve and delete them.",
    features: [
      { text: "Sortable, filterable table with name, email, category, location and created date. The category cell opens a popup with all categories of the profile." },
      { text: "Row actions: View, Edit, Duplicate (creates a copy named \"Copy of ...\") and Delete." },
      { text: "Approve or revoke approval of a profile. Only approved profiles can generate resumes.", superOnly: true },
      { text: "Extra columns for the owning admin and the billing admin.", superOnly: true },
      { text: "Admin Template Visibility panel: choose which resume templates admins are allowed to pick. At least one must stay visible.", superOnly: true },
    ],
    tips: [
      { text: "Profiles created by an admin start as pending and must be approved by a super admin. Profiles created by a super admin are approved automatically." },
      { text: "Duplicating is the fastest way to create a similar profile (same background, different name or email)." },
      { text: "Deleting a profile may be refused by the server (for example when it is still in use); the error message is shown in a toast." },
    ],
    keywords: ["profile", "approve", "approval", "duplicate", "delete", "template visibility", "pending"],
  },
  {
    id: "profiles-new",
    title: "Create / edit a profile",
    group: "Admin panel",
    route: "/dashboard/profiles/new",
    routeLabel: "Open create form",
    purpose:
      "The form used to create a profile (and, with the same fields, to edit one). The View page shows every setting read-only, including approval status, billing admin and visibility.",
    features: [
      { text: "Basic information: full name, email, phone, location, LinkedIn and GitHub URL. You can also set the job category." },
      { text: "Billing admin: choose which active admin pays for this profile's usage. Required when a super admin creates a profile and can be changed later by a super admin. Admins see it read-only.", superOnly: true },
      { text: "Education and work experience entries (add, remove, current-job checkbox, month pickers)." },
      { text: "Resume template: the layout used for the PDF. Admins can only pick templates that a super admin has made visible." },
      { text: "Resume sections: include or exclude Key Projects, Certifications and Awards & Recognition." },
      { text: "Generation API: an option to use the legacy generation API for this profile." },
      { text: "Job filtering: optionally block lead-level and architect roles (no resume is generated for them)." },
      { text: "Job title tailoring: when on, the header title and current position title are reworded to match each job description." },
      { text: "Allowed languages: job descriptions in other languages are rejected (default English)." },
      { text: "Default compensation: shown in the Assistant bubble when a job description has no pay information." },
      { text: "Resume autofill helper to prefill fields from an existing resume." },
    ],
    tips: [
      { text: "The template chosen here is the one the extension uses to render the PDF for this profile, and the one used when you download a PDF from the logs." },
      { text: "The email of a profile also decides who is billed for Mail Triage on that Gmail address, so use the real address." },
    ],
    keywords: ["billing admin", "template", "languages", "compensation", "legacy", "title tailoring", "lead roles", "form"],
  },
  {
    id: "blacklist",
    title: "Blacklist",
    group: "Admin panel",
    route: "/dashboard/blacklist",
    purpose: "Companies that should never get a resume. Jobs at these companies are skipped automatically.",
    features: [
      { text: "Add companies in bulk: one company name per line. Matching is case-insensitive." },
      { text: "The result tells you how many were added and how many were already on the list." },
      { text: "Searchable table of blacklisted companies with the date added, and a remove button per row." },
    ],
    tips: [
      { text: "When a job is skipped for this reason no resume or cover letter is generated, so it costs nothing." },
    ],
    keywords: ["company", "skip", "block"],
  },
  {
    id: "logs",
    title: "Generation Logs",
    group: "Admin panel",
    route: "/dashboard/logs",
    purpose:
      "A record of every generation attempt: who ran it, for which profile and job, and what the outcome was. Admins see the logs of their own profiles; super admins see all of them.",
    features: [
      { text: "Period tabs: Today, This week, This month, All time and a custom date range." },
      { text: "Summary cards for the selected period: total, applied and each outcome (matched, mismatched, duplicated, reposted, not a JD, skipped, error)." },
      { text: "Estimated cost card, cost column and cost totals.", superOnly: true },
      { text: "Filters: user, profile, status (Matched, Mismatched, Unfit, Not JD, Duplicate URL, Reposted, AI Error), original versus regenerated, and a text search over user, profile, position and company." },
      { text: "Row actions: view the job description (with a copyable public link), view the reason for a non-matched outcome, download the resume as PDF and download it as Word (.docx)." },
      { text: "Downloads are rendered from the saved resume content using the profile's resume template. Word is the most reliable format for ATS parsing." },
      { text: "Refresh menu: Fast Refresh syncs only new changes; Hard Refresh clears the local cache and reloads everything." },
      { text: "Sortable columns, pagination, and filters that are kept in the page URL so a view can be shared." },
    ],
    tips: [
      { text: "Logs are cached in your browser. Only the last 6 months are ever loaded or kept; older records are not shown." },
      { text: "The first load on a device fetches only the visible date range (plus a 7-day buffer). Widening the range fetches older data on demand." },
      { text: "After the first load, normal loads only fetch changes since the last sync (delta). Use Hard Refresh if the numbers look stale or wrong." },
      { text: "Logs of deactivated or deleted users keep the user's name." },
      { text: "A download is only possible when the log has saved resume content (otherwise the buttons are disabled)." },
    ],
    keywords: ["history", "outcomes", "pdf", "word", "docx", "download", "cache", "delta", "refresh", "matched", "mismatch", "duplicate", "reposted"],
  },
  {
    id: "rules",
    title: "Rules",
    group: "Admin panel",
    route: "/dashboard/rules",
    superOnly: true,
    purpose: "Resume improvement rules (short instructions) that are applied when resumes are generated.",
    features: [
      { text: "Create, edit and delete rules. Each rule has a rule sentence, a target section (Summary, Work Experience, Education, Skills or Global) and an Active switch." },
      { text: "Table with search and filters on target section and status." },
      { text: "The content is locked by default: unlock it to read or change rules. Creating, updating and deleting ask for your password." },
    ],
    tips: [
      { text: "Mark a rule inactive instead of deleting it if you may want it back." },
      { text: "Rules affect every profile, so test the wording on a few jobs after changing one." },
    ],
    keywords: ["rule", "prompt", "instruction", "section"],
  },
  {
    id: "users",
    title: "Users",
    group: "Admin panel",
    route: "/dashboard/users",
    purpose:
      "Manage the people who use the system. Admins manage bidders; super admins manage both admins and bidders.",
    features: [
      { text: "Searchable table with name, email, profiles, status and created date. By default only active users are shown." },
      { text: "Super admins see tabs (All Users, Admins, Bidders) and a Role column.", superOnly: true },
      { text: "Create a user: choose a role, name and email, and assign profiles. A bidder password is optional, an admin password is required. Admins can only create bidders." },
      { text: "Edit a user: change name, email and assigned profiles." },
      { text: "Edit also lets a super admin change the role and assign bidders to an admin; the assigned bidders then appear on that admin's Users page.", superOnly: true },
      { text: "Deactivate or activate a user." },
      { text: "Delete a user: this is a soft delete. The user is deactivated and removed from the lists, but their generation logs are kept and still show their name." },
      { text: "Approve a newly registered admin so they can log in and use the dashboard.", superOnly: true },
    ],
    tips: [
      { text: "Deactivate a bidder who leaves; their key stops working (\"User account is inactive\")." },
      { text: "Deleting is not needed to preserve history: logs are kept in both cases." },
    ],
    keywords: ["bidder", "admin", "create user", "deactivate", "delete", "soft delete", "approve admin", "role"],
  },
  {
    id: "keys",
    title: "Keys (Access Keys)",
    group: "Admin panel",
    route: "/dashboard/tokens",
    purpose:
      "A key is what a bidder types into the SwiftCV extension. Admins request keys and view the keys of their users; super admins generate and manage them.",
    features: [
      { text: "Admins: request a key for one of their bidders or for themselves (optional expiration date and a note). Track the request status (pending, approved, declined) in My Requests." },
      { text: "Admins: view their keys (My Keys) read-only. The table shows the user, issue date, expiry, allowed IPs and status. Copy the key with the copy button." },
      { text: "Generate a key directly for any user, with an optional expiration date and an optional list of allowed IPs.", superOnly: true },
      { text: "Review key requests: approve (this generates the key) or decline, with an optional note back to the admin. A badge shows how many requests are pending.", superOnly: true },
      { text: "Extend or clear the expiration date (empty means never expires).", superOnly: true },
      { text: "Revoke and re-activate a key, or delete it.", superOnly: true },
      { text: "Assign a key to admins so they can see it read-only in their list.", superOnly: true },
      { text: "IP whitelist per key: one plain IPv4 or IPv6 address per line (or comma separated). CIDR ranges are not supported and a key can have at most 50 addresses. When the list is empty the key works from any IP.", superOnly: true },
    ],
    tips: [
      { text: "A user can only have one active key at a time; users who already have one are disabled in the picker." },
      { text: "If a bidder gets \"Generation is not allowed from this IP address\", their current public IP is not in the key's whitelist. Ask a super admin to update the list." },
      { text: "The Allowed IPs column shows \"Any IP\" when no whitelist is set." },
      { text: "The Keys page asks super admins to confirm their password on entry, and again for sensitive actions.", superOnly: true },
    ],
    keywords: ["token", "key", "request", "expire", "extend", "revoke", "ip", "whitelist", "assign admins", "access"],
  },
  {
    id: "credits",
    title: "Credits",
    group: "Admin panel",
    route: "/dashboard/credits",
    purpose: "Your balance, deposits and a breakdown of what your credit was spent on. Visible to admins and super admins.",
    features: [
      { text: "Current balance, with a yellow banner when it is low and a red banner when usage is blocked." },
      { text: "Deposit Crypto: enter an amount in USD (minimum $15) and continue to the NOWPayments invoice page, where you pick the coin and network. The balance updates automatically once the payment is confirmed." },
      { text: "Credit usage: pick a date range (Today, Yesterday, This week, Last week, This month, Last month, Last 7 days, Last 30 days, Last 3 months or custom). See the amount spent, the number of requests and the split by app: resume generations, Assistant and Mail triage." },
      { text: "Super admins see the list of all admins with their status and balance, can adjust a balance up or down with a reason, and can filter the usage view by admin.", superOnly: true },
      { text: "Usage rate: the multiplier applied on top of raw AI cost when admins are billed (range 1 to 10). Changing it affects all future usage.", superOnly: true },
    ],
    tips: [
      { text: "Below $5 you get a warning; at $0 or below everything billed to you is blocked until you top up." },
      { text: "Mail Triage emails that were blocked for lack of credit are retried on the next run after you top up." },
    ],
    keywords: ["balance", "deposit", "crypto", "nowpayments", "usage", "spend", "low balance", "billing"],
  },
  {
    id: "mail-triage-admin",
    title: "Mail Triage (admin page)",
    group: "Admin panel",
    route: "/dashboard/mail-triage",
    superOnly: true,
    purpose: "Monitor and manage the Mail Triage Gmail extension. The old /mail-triage-test and /mail-triage-allowlist routes redirect here.",
    features: [
      { text: "Logs tab: runs of the extension with period filter (Today, This week, This month, All time, custom), a search by email or profile, totals for runs, emails analyzed, unique accounts and cost, and a sortable table with Gmail account, profile, emails and tokens." },
      { text: "Test tab: paste an email body and click Check Category to see how the classifier would label it." },
      { text: "Allowlist tab: add a Gmail address (with an optional note), edit or remove entries. Only allowlisted addresses can use Mail Triage." },
    ],
    tips: [
      { text: "If a user reports \"This email is not authorized to use Mail Triage\", add their Gmail address to the allowlist." },
      { text: "The sidebar item is under Tools and is only visible to super admins." },
    ],
    keywords: ["gmail", "allowlist", "classifier", "email", "test"],
  },
  {
    id: "versions",
    title: "Extensions (releases)",
    group: "Admin panel",
    route: "/dashboard/versions",
    superOnly: true,
    purpose:
      "Release management for the browser extensions. The version that is marked current is the only one the backend accepts.",
    features: [
      { text: "Upload the setup file of a new extension version, add a version number and changelog, and release it." },
      { text: "Roll back by making an earlier version current again." },
      { text: "Edit the version number, release date and changelog of an existing version." },
      { text: "Versions are grouped per extension (for example SwiftCV and Mail Triage)." },
    ],
    tips: [
      { text: "The version must match exactly. An extension whose version differs from the current release is rejected (\"Extension version mismatch\" for SwiftCV, \"Extension version outdated\" for Mail Triage)." },
      { text: "Releasing a version forces everyone to update; older versions stop working. Release only when the file is ready." },
      { text: "The public Download page offers the current setup files, so users always install a version that is accepted." },
    ],
    keywords: ["release", "version", "upload", "setup file", "rollback", "roll back", "changelog", "current"],
  },
  {
    id: "download",
    title: "Download page (for bidders)",
    group: "Admin panel",
    route: "/download",
    routeLabel: "Open Download page",
    routeExternal: true,
    purpose:
      "A public page (no login) where people download the extensions. It is the link you share with new bidders. It is also reachable from the Download item in the sidebar.",
    features: [
      { text: "Share the link /download with a bidder; they can get the extension without an admin panel account." },
      { text: "The Download sidebar item opens the page in a new tab." },
    ],
    tips: [
      { text: "Send the bidder their key separately; the page does not contain keys." },
      { text: "If someone installed an old copy, have them download again from this page and reinstall." },
    ],
    keywords: ["install", "share", "public", "link", "extension"],
  },
  {
    id: "help",
    title: "Help (this page)",
    group: "Admin panel",
    route: "/dashboard/help",
    purpose: "Documentation for the admin panel and the extensions, tailored to your role.",
    features: [
      { text: "Use the search box to filter sections; the contents list on the left jumps to a section." },
      { text: "You only see pages and features that your role can use. Features that only super admins can use carry a \"Super admin\" badge." },
    ],
    tips: [
      { text: "Content lives in src/content/helpContent.ts so it is easy to update." },
    ],
    keywords: ["docs", "documentation", "faq"],
  },

  // ───────────────────────────── Extensions ─────────────────────────────
  {
    id: "ext-swiftcv",
    title: "SwiftCV (resume generator)",
    group: "Extensions",
    route: "/download",
    routeLabel: "Open Download page",
    routeExternal: true,
    purpose:
      "A Chrome extension that turns a job description into a tailored resume and cover letter, created as PDFs in the browser.",
    features: [
      { text: "Get it: the bidder downloads the extension from the public Download page (/download) and installs it in Chrome. On first install a setup window asks for the key." },
      { text: "Sign in: paste the key and click Validate & Save. The key is checked and the profiles assigned to the user are loaded." },
      { text: "Choose a profile: with one profile it is confirmed in a window; with several, a picker appears. The toolbar popup shows the active profile, offers Switch Profile and shows \"Pending Confirmation\" or \"Not Configured\" when setup is incomplete." },
      { text: "Generate: open a job posting, select the job description text, right-click and choose \"Generate Resume and Cover Letter\"." },
      { text: "The progress window shows the steps: Generating with AI, Creating Resume PDF, Creating Cover Letter PDF, Downloading files, Complete. Both PDFs download automatically." },
      { text: "The resume layout comes from the Resume Template set on the profile (see Create / edit a profile). Cover letter is generated in the same run." },
      { text: "Non-generation outcomes are explained in the progress window: job not qualified, not a job description, already applied (with the date), reposted job, or does not match the profile. Bidders can only close the window." },
      { text: "Low credit: when the billing admin's balance is below $5 a yellow notice appears, but the resume is still generated. At $0 the request is refused with \"Insufficient credit. The billing admin's credit balance is empty, please top up to continue.\"" },
      { text: "\"Generation is not allowed from this IP address\": the key has an IP whitelist and the bidder's current public IP is not on it. A super admin must add the IP (or clear the list)." },
      { text: "\"Extension version mismatch. Please update your extension to the latest version.\": the installed version is not the current release. The progress window shows \"Update required\". Download the latest version from /download, reinstall and try again." },
      { text: "\"Profile is not approved. Please contact your admin.\": the profile is still pending. Unapproved profiles are not offered to the extension." },
      { text: "Keys of admin accounts get extra controls: a \"Resume only\" switch in the popup that skips the cover letter, and the option to Generate Anyway after a duplicate, not-a-JD, unfit, reposted or mismatch warning. AI errors can be retried." },
      { text: "A switch in the popup shows or hides the Assistant chat bubble." },
      { text: "Release notes: each release is uploaded and made current on the Extensions page. Bidders on older versions are blocked until they update. Unless a version is current, the version check fails.", superOnly: true },
    ],
    tips: [
      { text: "When a bidder reports a problem, ask for the exact message in the progress window; then check the FAQ below." },
      { text: "\"Invalid key\" means the key is wrong, revoked or expired. Check it on the Keys page." },
      { text: "\"User account is inactive\" means the user was deactivated on the Users page." },
      { text: "Credit is charged to the profile's billing admin, not to the bidder." },
    ],
    keywords: ["swiftcv", "install", "key", "profile", "resume", "cover letter", "progress", "template", "ip", "version", "outdated", "insufficient", "credit", "right click", "context menu"],
  },
  {
    id: "ext-assistant",
    title: "Assistant (chat bubble)",
    group: "Extensions",
    purpose:
      "A floating chat bubble added by SwiftCV to every web page. It answers questions about the resume and the job, for example answers to application form questions.",
    features: [
      { text: "Click the bubble to open the chat. Turn it on or off with the chat bubble switch in the SwiftCV popup." },
      { text: "Context: after a resume has been generated, the Assistant uses that generation's log (the position, company and job description) and says so in its welcome message. Without a recent generation you can attach your resume and cover letter as PDFs instead." },
      { text: "You can attach PDFs and ask follow-up questions; the last 8 turns of the conversation are sent along." },
      { text: "A compensation badge shows pay information for the last job when available; the profile's default compensation is used when the job description has none." },
      { text: "Billing: each message is billed to the profile's billing admin, exactly like a generation, and appears under \"Assistant\" in Credit usage." },
      { text: "Credit behavior: a yellow warning message is added to the chat when the balance is below $5. When it is empty the chat shows an \"Insufficient credit\" error and does not answer." },
      { text: "If no key is configured the chat shows \"No SwiftCV key found. Please set up the extension first.\"" },
    ],
    tips: [
      { text: "The Assistant needs the same key as SwiftCV; if generation is blocked by credit, the Assistant is blocked too." },
      { text: "Answers are only as good as the context: generate the resume first so the Assistant knows the job." },
    ],
    keywords: ["chat", "bubble", "assistant", "ai", "questions", "compensation", "pdf attach", "billing"],
  },
  {
    id: "ext-mail-triage",
    title: "Mail Triage (Gmail extension)",
    group: "Extensions",
    purpose:
      "A Chrome extension that reads Gmail messages in a date range, decides which are job related, and labels them by stage.",
    features: [
      { text: "Sign in with Google: click Authenticate in the popup. The extension needs permission to read and modify Gmail labels." },
      { text: "Run: pick a From and To date (defaults to the last 7 days) and click Check. The popup shows status, a live summary and any warning." },
      { text: "It classifies each email as job related or not. Job emails get the Gmail label Jobs plus one stage label: Jobs/Applications, Jobs/Failures, Jobs/Assessments, Jobs/Interviews, Jobs/Offers, Jobs/Follow-Up, Jobs/Surveys or Jobs/Other. Other emails get the label General." },
      { text: "Assessments, Interviews and Offers are also starred. Read/unread state is never changed. Spam in the date range is checked too." },
      { text: "Only the sender, subject, date, Gmail category hints and the first part of the body are sent to the backend for classification." },
      { text: "Reset Cache clears the list of processed emails so everything in the range is evaluated again. Emails already processed are skipped otherwise." },
      { text: "Billing: each batch is billed to the billing admin of the profile whose email matches the Gmail address being triaged. If no profile has that email, no credit is checked." },
      { text: "Allowlist: the Gmail address must be on the allowlist, otherwise the run fails with \"This email is not authorized to use Mail Triage.\"" },
      { text: "Low credit: a warning appears under the status when the billing admin's balance is below $5; the run continues." },
      { text: "Insufficient credit: the run stops and the status turns red with the \"Insufficient credit\" message. The affected emails are left unprocessed, so they are picked up again on the next Check after a top-up." },
      { text: "\"Extension version outdated. Please update Mail-Triage to the latest version.\": the installed version is not the current release; download the latest from /download." },
      { text: "Manage the allowlist, test the classifier and view runs on the Mail Triage admin page.", superOnly: true },
    ],
    tips: [
      { text: "To fix a blocked user, top up the billing admin of the profile with the same email as the Gmail account, then click Check again." },
      { text: "If the Gmail address does not appear on any profile, check that the profile's email is spelled exactly like the Gmail address." },
    ],
    keywords: ["mail", "gmail", "triage", "labels", "stages", "jobs", "allowlist", "insufficient credit", "retry", "billing", "oauth"],
  },
];

export const faqItems: FaqItem[] = [
  {
    id: "faq-insufficient-credit",
    q: "Why is generation blocked with \"Insufficient credit\"?",
    a: "The billing admin of the profile has a balance of $0 or less. Top up on the Credits page (minimum deposit $15). Once the payment is confirmed the bidder can generate again. The same applies to the Assistant and Mail Triage.",
  },
  {
    id: "faq-low-credit",
    q: "What does the low-credit warning mean?",
    a: "The balance is below $5. Nothing is blocked yet, but usage stops when it reaches $0. Add credit soon.",
  },
  {
    id: "faq-ip",
    q: "Why do I see \"Generation is not allowed from this IP address\"?",
    a: "The bidder's key has an IP whitelist and their current public IP is not on it (for example after a VPN or network change). A super admin can add the IP or clear the list on the Keys page; an empty list allows any IP.",
  },
  {
    id: "faq-version",
    q: "Why do I see \"Extension version mismatch\" or \"Update required\"?",
    a: "The installed extension is not the current release; the version must match exactly. Download the latest version from the Download page (/download), reinstall it and try again.",
  },
  {
    id: "faq-not-approved",
    q: "Why do I see \"Profile is not approved\"?",
    a: "Profiles created by an admin wait for a super admin's approval. Ask a super admin to approve the profile on the Profiles page.",
  },
  {
    id: "faq-invalid-key",
    q: "The extension says \"Invalid key\". What now?",
    a: "The key is mistyped, revoked or expired. Check its status on the Keys page, and request a new key if needed. A user can only have one active key.",
  },
  {
    id: "faq-inactive",
    q: "A bidder gets \"User account is inactive\".",
    a: "The user was deactivated. Activate them again on the Users page.",
  },
  {
    id: "faq-skipped",
    q: "Why was no resume generated for a job?",
    a: "The progress window explains it: not qualified, not a job description, already applied to that URL, a repost of an earlier application, a mismatch with the profile, or the company is on the Blacklist. Details are also in Generation Logs (View reason).",
  },
  {
    id: "faq-logs-old",
    q: "Why can't I see logs older than 6 months?",
    a: "The Logs page only loads and caches the last 6 months. Use Hard Refresh if recent logs look incomplete.",
  },
  {
    id: "faq-deleted-user",
    q: "I deleted a user. Did the logs disappear?",
    a: "No. Deleting is a soft delete: the user is deactivated and hidden, but their generation logs are kept and still show their name.",
  },
  {
    id: "faq-mail-allowlist",
    q: "Mail Triage says \"This email is not authorized\".",
    a: "The Gmail address is not on the allowlist. A super admin adds it on the Mail Triage page, Allowlist tab.",
  },
  {
    id: "faq-mail-retry",
    q: "Mail Triage stopped because of credit. Are those emails lost?",
    a: "No. They are left unprocessed. After the billing admin tops up, click Check again and they are classified.",
  },
  {
    id: "faq-rate",
    q: "How is the usage rate applied?",
    a: "Billed amount is the raw AI cost multiplied by the usage rate set on the Credits page.",
    superOnly: true,
  },
];
