"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import LogsTab from "./_components/LogsTab";
import TestTab from "./_components/TestTab";
import AllowlistTab from "./_components/AllowlistTab";

type Tab = "logs" | "test" | "allowlist";

const TABS: { label: string; value: Tab }[] = [
  { label: "Logs", value: "logs" },
  { label: "Test", value: "test" },
  { label: "Allowlist", value: "allowlist" },
];

export default function MailTriagePage() {
  const [activeTab, setActiveTab] = useState<Tab>("logs");

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Mail Triage</h1>
        </div>
        <p className="text-gray-600 mt-2">Manage and monitor the Mail Triage extension</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.value
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "logs" && <LogsTab />}
      {activeTab === "test" && <TestTab />}
      {activeTab === "allowlist" && <AllowlistTab />}
    </>
  );
}
