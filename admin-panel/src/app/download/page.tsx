"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Copy, Check, Puzzle, PackageX } from "lucide-react";
import { PublicDownload, extensionService, formatBytes, formatDate } from "@/services/extensionService";

export default function DownloadPage() {
  const [items, setItems] = useState<PublicDownload[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setItems(null);
    try {
      setItems(await extensionService.listPublicDownloads());
    } catch (e: any) {
      setError(e.message || "Could not load downloads");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const t = document.createElement("textarea");
      t.value = window.location.href;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">HHQ extensions</h1>
          <p className="text-gray-600 mt-2">Download the latest release of each extension.</p>
          <button
            onClick={copyLink}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Link copied" : "Copy share link"}
          </button>
        </div>

        {items === null && !error && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600" />
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={load} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Try again
            </button>
          </div>
        )}

        {items && items.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center text-gray-600">No extensions are published yet.</div>
        )}

        <div className="space-y-6">
          {items?.map((x) => (
            <div key={x.extension_name} className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center gap-3 mb-2">
                <Puzzle className="w-6 h-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">{x.display_name || x.extension_name}</h2>
              </div>
              {x.download_url ? (
                <>
                  <p className="text-sm text-gray-500">
                    Version <b className="text-gray-800">v{x.version}</b> - released {formatDate(x.released_at ?? x.release_date)}
                    {x.file_size ? ` - ${formatBytes(x.file_size)}` : ""}
                  </p>
                  {x.changelog && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">What&apos;s new</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{x.changelog}</p>
                    </div>
                  )}
                  <a
                    href={x.download_url}
                    className="mt-6 flex items-center justify-center gap-2 w-full px-6 py-4 text-lg font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download v{x.version}
                  </a>
                </>
              ) : (
                <div className="mt-4 flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-600">
                  <PackageX className="w-6 h-6 text-gray-400" />
                  <span>Not available yet. Please check back soon.</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">How to install</h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-700">
            <li>Download the zip file and unzip it to a folder you will keep (do not delete it).</li>
            <li>
              Open <code className="px-1 bg-gray-100 rounded">chrome://extensions</code> in Chrome.
            </li>
            <li>Turn on <b>Developer mode</b> (top-right switch).</li>
            <li>Click <b>Load unpacked</b>.</li>
            <li>Select the unzipped folder (the one containing <code className="px-1 bg-gray-100 rounded">manifest.json</code>).</li>
          </ol>
          <h3 className="text-sm font-semibold text-gray-800 mt-5 mb-1">Updating</h3>
          <p className="text-sm text-gray-700">
            Download the new zip, replace the contents of your existing folder with the new files, then click the reload
            icon on the extension in <code className="px-1 bg-gray-100 rounded">chrome://extensions</code>. The extension
            must match the latest version to keep working.
          </p>
        </div>
      </div>
    </div>
  );
}
