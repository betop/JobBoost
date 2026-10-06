"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Rocket,
  RotateCcw,
  Download,
  Trash2,
  AlertCircle,
  FileArchive,
  ExternalLink,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import PasswordConfirmModal from "@/components/PasswordConfirmModal";
import Modal from "@/components/Modal";
import {
  EXTENSIONS,
  MAX_FILE_BYTES,
  VERSION_REGEX,
  ExtensionVersion,
  extensionService,
  formatBytes,
  formatDate,
} from "@/services/extensionService";

type FormState = {
  mode: "create" | "edit";
  versionId?: number | string;
  extension_name: string;
  version: string;
  changelog: string;
  min_extension_version: string;
  file: File | null;
  releaseNow: boolean;
  existingFileName?: string | null;
};

type Pending =
  | { kind: "release"; v: ExtensionVersion; rollback: boolean }
  | { kind: "delete"; v: ExtensionVersion }
  | { kind: "form" };

function cmpVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function StatusBadge({ v }: { v: ExtensionVersion }) {
  if (v.status === "live")
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Live</span>;
  if (v.status === "archived")
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Previous</span>;
  return v.file_url || v.file_name ? (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Draft - Ready to release</span>
  ) : (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Draft - no file</span>
  );
}

export default function ExtensionManagement() {
  const router = useRouter();
  const { showToast } = useUIStore();
  const admin = useAuthStore((s) => s.admin);

  const [versions, setVersions] = useState<ExtensionVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>(EXTENSIONS[0].key);
  const [verified, setVerified] = useState(false);
  const [showAccess, setShowAccess] = useState(true);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setVersions(await extensionService.listVersions());
    } catch (e: any) {
      setLoadError(e.message || "Failed to load versions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (verified) fetchVersions();
  }, [verified, fetchVersions]);

  const tabVersions = useMemo(
    () =>
      versions
        .filter((v) => v.extension_name === tab)
        .sort((a, b) => cmpVersions(b.version, a.version)),
    [versions, tab]
  );
  const live = tabVersions.find((v) => v.status === "live" || v.is_current);
  const tabLabel = EXTENSIONS.find((e) => e.key === tab)?.label || tab;

  const hasFile = (v: ExtensionVersion) => !!(v.file_url || v.file_name);

  // ---------- Form ----------
  const openCreate = () => {
    setFormError(null);
    setProgress(0);
    setForm({
      mode: "create",
      extension_name: tab,
      version: "",
      changelog: "",
      min_extension_version: "",
      file: null,
      releaseNow: false,
    });
  };

  const openEdit = (v: ExtensionVersion) => {
    setFormError(null);
    setProgress(0);
    setForm({
      mode: "edit",
      versionId: v.id,
      extension_name: v.extension_name,
      version: v.version,
      changelog: v.changelog || "",
      min_extension_version: v.min_extension_version || "",
      file: null,
      releaseNow: false,
      existingFileName: v.file_name,
    });
  };

  const closeForm = () => {
    if (uploading) return;
    setForm(null);
  };

  const onPickFile = (f: File | null) => {
    setFormError(null);
    if (!f) return setForm((s) => (s ? { ...s, file: null } : s));
    if (!f.name.toLowerCase().endsWith(".zip")) {
      setFormError("Only .zip files are allowed");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFormError(`File is too large (${formatBytes(f.size)}). Maximum is 100 MB`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setForm((s) => (s ? { ...s, file: f } : s));
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const ver = form.version.trim();
    if (form.mode === "create") {
      if (!VERSION_REGEX.test(ver)) return setFormError("Version must look like 1.2.3 or 1.2 (digits and dots)");
      if (versions.some((v) => v.extension_name === form.extension_name && v.version === ver))
        return setFormError(`Version ${ver} already exists for this extension`);
      if (!form.file) return setFormError("Please choose the setup .zip file (you can also create a draft by uploading later via Edit)");
    }
    const min = form.min_extension_version.trim();
    if (min && !VERSION_REGEX.test(min)) return setFormError("Minimum version must look like 1.2.3 or 1.2");
    setFormError(null);
    setPending({ kind: "form" });
    setShowPassword(true);
  };

  const runForm = async () => {
    if (!form) return;
    setUploading(true);
    setProgress(0);
    setFormError(null);
    try {
      const base = {
        changelog: form.changelog,
        min_extension_version: form.min_extension_version.trim(),
        file: form.file,
      };
      if (form.mode === "create") {
        const created = await extensionService.createVersion(
          { ...base, extension_name: form.extension_name, version: form.version.trim() },
          setProgress
        );
        if (form.releaseNow) {
          if (!created?.id) throw new Error("Uploaded, but could not release (no id returned). Release it from the list.");
          try {
            await extensionService.release(created.id);
            showToast(`v${form.version.trim()} uploaded and released`, "success");
          } catch (err: any) {
            showToast(`Uploaded as draft, but release failed: ${err.message}`, "error");
          }
        } else {
          showToast("Draft version created", "success");
        }
      } else {
        await extensionService.updateVersion(form.versionId!, base, setProgress);
        showToast("Version updated", "success");
      }
      setForm(null);
      fetchVersions();
    } catch (err: any) {
      setFormError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setPending(null);
    }
  };

  // ---------- Release / delete ----------
  const runRelease = async (v: ExtensionVersion, rollback: boolean) => {
    try {
      await extensionService.release(v.id);
      showToast(rollback ? `Rolled back to v${v.version}` : `v${v.version} is now live`, "success");
      fetchVersions();
    } catch (err: any) {
      showToast(err.message || "Release failed", "error");
    }
  };

  const runDelete = async (v: ExtensionVersion) => {
    try {
      await extensionService.deleteVersion(v.id);
      showToast(`v${v.version} deleted`, "success");
      fetchVersions();
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  const onPasswordConfirmed = () => {
    // Never throw / await long work here: errors are handled inside, progress shown in the form modal.
    const p = pending;
    if (!p) return;
    if (p.kind === "form") {
      void runForm();
    } else if (p.kind === "release") {
      setBusy(true);
      void runRelease(p.v, p.rollback).finally(() => {
        setBusy(false);
        setPending(null);
      });
    } else if (p.kind === "delete") {
      setBusy(true);
      void runDelete(p.v).finally(() => {
        setBusy(false);
        setPending(null);
      });
    }
  };

  // ---------- Access gate ----------
  if (!verified) {
    return (
      <PasswordConfirmModal
        isOpen={showAccess}
        onClose={() => setShowAccess(false)}
        onCancel={() => router.push("/dashboard")}
        onConfirm={() => {
          setVerified(true);
          setShowAccess(false);
        }}
        title="Access Releases"
        description="Please confirm your password to access extension release management"
      />
    );
  }

  if (admin && admin.type && admin.type !== "super_admin") {
    return <div className="p-8 text-gray-600">Only super admins can manage releases.</div>;
  }

  const pendingRelease = pending?.kind === "release" && !showPassword && !busy ? pending : null;
  const pendingDelete = pending?.kind === "delete" && !showPassword && !busy ? pending : null;

  return (
    <>
      <PasswordConfirmModal
        isOpen={showPassword}
        onClose={() => setShowPassword(false)}
        onCancel={() => {
          if (!uploading && !busy) setPending(null);
        }}
        onConfirm={onPasswordConfirmed}
        title="Confirm Action"
        description={
          pending?.kind === "release"
            ? pending.rollback
              ? "Confirm your password to roll back this release"
              : "Confirm your password to release this version"
            : pending?.kind === "delete"
            ? "Confirm your password to delete this version"
            : form?.mode === "edit"
            ? "Confirm your password to save changes"
            : "Confirm your password to upload this version"
        }
      />

      {/* Release / rollback impact modal */}
      <Modal
        isOpen={!!pendingRelease}
        onClose={() => setPending(null)}
        title={pendingRelease?.kind === "release" && pendingRelease.rollback ? `Roll back to v${pendingRelease.v.version}` : `Release v${pendingRelease?.v.version ?? ""}`}
        size="sm"
      >
        {pendingRelease?.kind === "release" && (
          <div className="p-6 space-y-4">
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <div>
                {pendingRelease.rollback ? (
                  <>
                    All users must switch to <b>v{pendingRelease.v.version}</b>. Anyone on a newer version will be
                    rejected with &quot;Extension version outdated&quot; until they go back to this version.
                  </>
                ) : (
                  <>
                    <b>All users must update the {tabLabel} extension to v{pendingRelease.v.version}.</b> Extensions
                    still on the old version will be rejected with &quot;Extension version outdated&quot; until they update.
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPending(null)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={() => setShowPassword(true)} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                {pendingRelease.rollback ? `Roll back to v${pendingRelease.v.version}` : "Release"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={!!pendingDelete} onClose={() => setPending(null)} title={`Delete v${pendingDelete?.v.version ?? ""}`} size="sm">
        {pendingDelete?.kind === "delete" && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-700">
              This permanently deletes v{pendingDelete.v.version} and its uploaded file. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPending(null)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={() => setShowPassword(true)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload / edit modal */}
      <Modal
        isOpen={!!form}
        onClose={closeForm}
        title={form?.mode === "edit" ? `Edit v${form.version}` : "Upload new version"}
        size="md"
        closeOnBackdrop={!uploading}
      >
        {form && (
          <form onSubmit={submitForm} className="p-6 space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extension</label>
                <select
                  value={form.extension_name}
                  disabled={form.mode === "edit" || uploading}
                  onChange={(e) => setForm({ ...form, extension_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                >
                  {EXTENSIONS.map((x) => (
                    <option key={x.key} value={x.key}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                <input
                  type="text"
                  value={form.version}
                  disabled={form.mode === "edit" || uploading}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  placeholder="e.g. 1.2.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Changelog</label>
              <textarea
                value={form.changelog}
                disabled={uploading}
                onChange={(e) => setForm({ ...form, changelog: e.target.value })}
                rows={4}
                placeholder="What's new in this version?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum extension version <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.min_extension_version}
                disabled={uploading}
                onChange={(e) => setForm({ ...form, min_extension_version: e.target.value })}
                placeholder="e.g. 1.0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Setup file (.zip, max 100 MB)
                {form.mode === "edit" && <span className="text-gray-400 font-normal"> - leave empty to keep current{form.existingFileName ? ` (${form.existingFileName})` : ""}</span>}
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".zip,application/zip"
                disabled={uploading}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700"
              />
              {form.file && (
                <p className="mt-1 text-xs text-gray-500">
                  {form.file.name} - {formatBytes(form.file.size)}
                </p>
              )}
            </div>
            {form.mode === "create" && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.releaseNow}
                  disabled={uploading}
                  onChange={(e) => setForm({ ...form, releaseNow: e.target.checked })}
                />
                Release immediately after upload (forces all users to update)
              </label>
            )}
            {uploading && (
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{progress >= 100 ? "Processing..." : "Uploading..."}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {form.mode === "edit" ? "Save changes" : "Upload"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={uploading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Extension Releases</h1>
            <p className="text-gray-600 mt-1">Upload, release and roll back extension versions</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/download"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" />
              Public download page
            </a>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-5 h-5" />
              Upload new version
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            Bidder extensions must run <b>exactly</b> the live version, otherwise generation / mail triage is rejected
            with &quot;Extension version outdated&quot;. Releasing a new version forces every user to update; rolling back
            forces users on the newer version to go back.
          </p>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {EXTENSIONS.map((x) => (
            <button
              key={x.key}
              onClick={() => setTab(x.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === x.key ? "border-primary-600 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>

        {loading && versions.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600" />
          </div>
        ) : loadError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {loadError}{" "}
            <button onClick={fetchVersions} className="underline">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Live release */}
            <div className="bg-white rounded-lg shadow-md border border-green-200 p-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-bold text-gray-900">Live release - {tabLabel}</h2>
                {live && <StatusBadge v={live} />}
              </div>
              {live ? (
                <div className="flex flex-wrap justify-between gap-4">
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="text-2xl font-semibold text-gray-900">v{live.version}</p>
                    <p>
                      Released {formatDate(live.released_at ?? live.release_date)}
                      {live.released_by_name ? ` by ${live.released_by_name}` : ""}
                    </p>
                    {live.min_extension_version && <p>Minimum version: v{live.min_extension_version}</p>}
                    <p className="flex items-center gap-1">
                      <FileArchive className="w-4 h-4" />
                      {live.file_name ? `${live.file_name} (${formatBytes(live.file_size)})` : "No file uploaded"}
                    </p>
                    {live.changelog && <p className="text-gray-700 whitespace-pre-line pt-2">{live.changelog}</p>}
                  </div>
                  {live.file_url && (
                    <a
                      href={live.file_url}
                      className="self-start flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No live release yet for {tabLabel}. Upload a version and release it.</p>
              )}
            </div>

            {/* History */}
            <h2 className="text-lg font-bold text-gray-900 mb-3">Release history</h2>
            {tabVersions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow-sm">No versions yet</div>
            ) : (
              <div className="space-y-3">
                {tabVersions.map((v) => {
                  const isLive = v.status === "live";
                  const file = hasFile(v);
                  return (
                    <div key={v.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-[16rem]">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">v{v.version}</h3>
                            <StatusBadge v={v} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {v.released_at
                              ? `Released ${formatDate(v.released_at)}${v.released_by_name ? ` by ${v.released_by_name}` : ""}`
                              : `Created ${formatDate(v.created_at ?? v.release_date)}`}
                            {v.min_extension_version ? ` - min v${v.min_extension_version}` : ""}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <FileArchive className="w-3.5 h-3.5" />
                            {v.file_name ? `${v.file_name} (${formatBytes(v.file_size)})` : "No file"}
                          </p>
                          {v.changelog && <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{v.changelog}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {!isLive && (
                            <button
                              disabled={!file || busy}
                              title={!file ? "Upload a setup file (Edit) before releasing" : undefined}
                              onClick={() => setPending({ kind: "release", v, rollback: v.status === "archived" })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {v.status === "archived" ? <RotateCcw className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
                              {v.status === "archived" ? `Roll back to v${v.version}` : "Release"}
                            </button>
                          )}
                          {v.file_url && (
                            <a
                              href={v.file_url}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </a>
                          )}
                          <button
                            onClick={() => openEdit(v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          {!isLive && (
                            <button
                              disabled={busy}
                              onClick={() => setPending({ kind: "delete", v })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
