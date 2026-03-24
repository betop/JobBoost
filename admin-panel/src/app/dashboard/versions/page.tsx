"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Check, AlertCircle } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import PasswordConfirmModal from "@/components/PasswordConfirmModal";

interface ExtensionVersion {
  id: string;
  extension_name: string;
  version: string;
  release_date: string;
  is_current: boolean;
  changelog?: string;
}

export default function ExtensionManagement() {
  const router = useRouter();
  const { showToast } = useUIStore();
  const [versions, setVersions] = useState<ExtensionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'create' | 'set-current'; data?: any; versionId?: string } | null>(null);
  const [formData, setFormData] = useState({
    extension_name: "swiftcv",
    version: "",
    changelog: "",
  });

  const extensions = ["swiftcv", "mail-triage"];

  useEffect(() => {
    if (!isPasswordVerified) {
      setShowPasswordConfirm(true);
    }
  }, [isPasswordVerified]);

  useEffect(() => {
    if (isPasswordVerified) {
      fetchVersions();
    }
  }, [isPasswordVerified]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/extension-versions");
      if (!response.ok) throw new Error("Failed to fetch versions");
      const data = await response.json();
      setVersions(data);
    } catch (error) {
      console.error("Error fetching versions:", error);
      showToast("Failed to load versions", "error");
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("admin_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.version.trim()) {
      showToast("Version number is required", "error");
      return;
    }

    setPendingAction({ type: 'create', data: { ...formData } });
    setShowActionConfirm(true);
  };

  const executeCreateVersion = async () => {
    if (!pendingAction || pendingAction.type !== 'create') return;

    try {
      const response = await fetch("/api/extension-versions", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(pendingAction.data),
      });

      if (!response.ok) throw new Error("Failed to create version");
      
      showToast("Version created successfully", "success");
      setFormData({ extension_name: "swiftcv", version: "", changelog: "" });
      setShowForm(false);
      fetchVersions();
      setPendingAction(null);
    } catch (error) {
      console.error("Error creating version:", error);
      showToast("Failed to create version", "error");
    }
  };

  const handleSetCurrent = async (versionId: string) => {
    setPendingAction({ type: 'set-current', versionId });
    setShowActionConfirm(true);
  };

  const executeSetCurrent = async () => {
    if (!pendingAction || pendingAction.type !== 'set-current') return;

    try {
      const response = await fetch(`/api/extension-versions/${pendingAction.versionId}/set-current`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to set current version");
      
      showToast("Current version updated successfully", "success");
      fetchVersions();
      setPendingAction(null);
    } catch (error) {
      console.error("Error setting current version:", error);
      showToast("Failed to update current version", "error");
    }
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    
    if (pendingAction.type === 'create') {
      await executeCreateVersion();
    } else if (pendingAction.type === 'set-current') {
      await executeSetCurrent();
    }
  };

  const groupedVersions = extensions.map((ext) => ({
    name: ext,
    versions: versions
      .filter((v) => v.extension_name === ext)
      .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()),
  }));

  if (loading || !isPasswordVerified) {
    return (
      <>
        <PasswordConfirmModal
          isOpen={showPasswordConfirm}
          onClose={() => {
            setShowPasswordConfirm(false);
          }}
          onCancel={() => {
            router.push("/dashboard");
          }}
          onConfirm={() => {
            setIsPasswordVerified(true);
            setShowPasswordConfirm(false);
          }}
          title="Access Extensions"
          description="Please confirm your password to access the Extensions page"
        />

        {loading && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PasswordConfirmModal
        isOpen={showActionConfirm}
        onClose={() => {
          setShowActionConfirm(false);
        }}
        onCancel={() => {
          setPendingAction(null);
        }}
        onConfirm={executePendingAction}
        title="Confirm Action"
        description={
          pendingAction?.type === 'set-current'
            ? "Please confirm your password to set this as the current version"
            : "Please confirm your password to create this version"
        }
      />

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Extension Management</h1>
            <p className="text-gray-600 mt-2">Manage extension versions and set current releases</p>
          </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Version
        </button>
      </div>

      {/* Create Version Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Version</h2>
          <form onSubmit={handleCreateVersion} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extension
                </label>
                <select
                  value={formData.extension_name}
                  onChange={(e) =>
                    setFormData({ ...formData, extension_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {extensions.map((ext) => (
                    <option key={ext} value={ext}>
                      {ext}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version Number
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) =>
                    setFormData({ ...formData, version: e.target.value })
                  }
                  placeholder="e.g., 1.0.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Changelog
              </label>
              <textarea
                value={formData.changelog}
                onChange={(e) =>
                  setFormData({ ...formData, changelog: e.target.value })
                }
                placeholder="What's new in this version?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Create Version
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Versions by Extension */}
      <div className="space-y-8">
        {groupedVersions.map((group) => (
          <div key={group.name} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 capitalize">{group.name}</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {group.versions.length === 0 ? (
                <div className="px-6 py-4 text-center text-gray-500">
                  No versions found for this extension
                </div>
              ) : (
                group.versions.map((version) => (
                  <div key={version.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            v{version.version}
                          </h3>
                          {version.is_current && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-600">Current</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Released: {new Date(version.release_date).toLocaleDateString()}
                        </p>
                        {version.changelog && (
                          <p className="text-sm text-gray-700 mt-2">{version.changelog}</p>
                        )}
                      </div>
                      {!version.is_current && (
                        <button
                          onClick={() => handleSetCurrent(version.id)}
                          className="flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
                        >
                          <Check className="w-4 h-4" />
                          Set Current
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Warning Message */}
      <div className="mt-8 flex items-start gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-yellow-900">Important</h3>
          <p className="text-sm text-yellow-800 mt-1">
            Setting a version as current will enforce users to update their extensions to that version. Older versions will stop working.
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
