"use client";

import { useState } from "react";

interface TemplateInfo {
  id: number;
  name: string;
  style: string;
  accent: string;      // CSS hex
  dark: string;
  medium: string;
  sidebar?: string;    // only template 8
  headerBand?: boolean; // templates 5, 9 have full-width header
  leftBar?: boolean;   // template 4
  leftSidebar?: boolean; // template 8
  centered?: boolean;  // template 3
}

const TEMPLATES: TemplateInfo[] = [
  { id: 1,  name: "Classic Blue",          style: "Timeless professional",       accent: "#2563eb", dark: "#1e3a5f", medium: "#3b82f6" },
  { id: 2,  name: "Emerald Modern",         style: "Pill-badge headers",           accent: "#059669", dark: "#064e3b", medium: "#10b981" },
  { id: 3,  name: "Royal Purple",           style: "Centered double-rule",         accent: "#7c3aed", dark: "#4c1d95", medium: "#8b5cf6", centered: true },
  { id: 4,  name: "Bold Red",               style: "Left accent bar",              accent: "#dc2626", dark: "#7f1d1d", medium: "#ef4444", leftBar: true },
  { id: 5,  name: "Sky Blue",               style: "Full-width header band",       accent: "#0284c7", dark: "#0c4a6e", medium: "#0ea5e9", headerBand: true },
  { id: 6,  name: "Amber Warm",             style: "Dashed rules",                 accent: "#b45309", dark: "#78350f", medium: "#d97706" },
  { id: 7,  name: "Teal Minimal",           style: "Lowercase name + thin rules",  accent: "#0f766e", dark: "#134e4a", medium: "#14b8a6" },
  { id: 8,  name: "Indigo Sidebar",         style: "Dark left sidebar",            accent: "#4f46e5", dark: "#1e1b4b", medium: "#6366f1", leftSidebar: true, sidebar: "#1e1b4b" },
  { id: 9,  name: "Rose Pink",              style: "Full-width accent header",     accent: "#ec4899", dark: "#831843", medium: "#f472b6", headerBand: true },
  { id: 10, name: "Slate Professional",     style: "Triple-dot separator",         accent: "#64748b", dark: "#1e293b", medium: "#94a3b8" },
];

interface TemplatePickerProps {
  value?: number;
  onChange: (templateId: number) => void;
}

function TemplatePreview({ tpl }: { tpl: TemplateInfo }) {
  // Miniature visual mockup of each template style
  return (
    <div className="w-full h-full bg-white rounded overflow-hidden relative text-[0px]" style={{ fontFamily: "sans-serif" }}>
      {/* Header area */}
      {tpl.headerBand ? (
        <div className="w-full" style={{ background: tpl.accent, height: "28%" }}>
          <div className="px-2 pt-2">
            <div className="h-2 rounded-sm mb-1" style={{ background: "rgba(255,255,255,0.9)", width: "60%" }} />
            <div className="h-1 rounded-sm" style={{ background: "rgba(255,255,255,0.6)", width: "40%" }} />
          </div>
        </div>
      ) : tpl.leftSidebar ? (
        <div className="flex h-full">
          <div className="flex-none" style={{ background: tpl.sidebar || tpl.dark, width: "32%" }}>
            <div className="p-1 pt-2">
              <div className="h-1.5 rounded-sm mb-1" style={{ background: "rgba(255,255,255,0.85)", width: "80%" }} />
              <div className="h-1 rounded-sm mb-2" style={{ background: "rgba(255,255,255,0.5)", width: "65%" }} />
              <div className="h-px mb-1" style={{ background: "rgba(255,255,255,0.3)" }} />
              {[70, 85, 60].map((w, i) => (
                <div key={i} className="h-1 rounded-sm mb-1" style={{ background: "rgba(255,255,255,0.4)", width: `${w}%` }} />
              ))}
            </div>
          </div>
          <div className="flex-1 p-1 pt-2">
            <BodyLines accent={tpl.accent} />
          </div>
        </div>
      ) : tpl.leftBar ? (
        <div className="flex">
          <div className="flex-none" style={{ background: tpl.accent, width: "6px", minHeight: "100%" }} />
          <div className="flex-1 p-1 pt-1.5">
            <div className="h-2 rounded-sm mb-1" style={{ background: tpl.dark, width: "55%" }} />
            <div className="h-1 rounded-sm mb-2" style={{ background: tpl.medium, width: "40%" }} />
            <BodyLines accent={tpl.accent} />
          </div>
        </div>
      ) : tpl.centered ? (
        <div className="p-1.5 pt-2 text-center">
          <div className="mx-auto h-2 rounded-sm mb-0.5" style={{ background: tpl.dark, width: "50%" }} />
          <div className="mx-auto h-1 rounded-sm mb-1" style={{ background: tpl.medium, width: "35%" }} />
          <div className="h-px mb-0.5" style={{ background: tpl.accent }} />
          <div className="h-px mb-2" style={{ background: tpl.medium, opacity: 0.5 }} />
          <BodyLines accent={tpl.accent} />
        </div>
      ) : (
        <div className="p-1.5 pt-2">
          <div className="h-2 rounded-sm mb-0.5" style={{ background: tpl.dark, width: "55%" }} />
          <div className="h-1 rounded-sm mb-1" style={{ background: tpl.medium, width: "38%" }} />
          <div className="h-px mb-2" style={{ background: tpl.accent }} />
          <BodyLines accent={tpl.accent} />
        </div>
      )}

      {/* Body lines (when not using sidebar layout which has its own) */}
      {(tpl.headerBand) && (
        <div className="p-1">
          <BodyLines accent={tpl.accent} />
        </div>
      )}
    </div>
  );
}

function BodyLines({ accent }: { accent: string }) {
  return (
    <div>
      {/* Section header */}
      <div className="h-1 rounded-sm mb-1" style={{ background: accent, width: "30%", opacity: 0.8 }} />
      {/* Content lines */}
      {[90, 75, 80, 65].map((w, i) => (
        <div key={i} className="h-0.5 rounded-sm mb-0.5" style={{ background: "#d1d5db", width: `${w}%` }} />
      ))}
      {/* Second section */}
      <div className="h-1 rounded-sm mt-1.5 mb-1" style={{ background: accent, width: "35%", opacity: 0.8 }} />
      {[85, 70].map((w, i) => (
        <div key={i} className="h-0.5 rounded-sm mb-0.5" style={{ background: "#d1d5db", width: `${w}%` }} />
      ))}
    </div>
  );
}

export default function TemplatePicker({ value = 1, onChange }: TemplatePickerProps) {
  const [previewTpl, setPreviewTpl] = useState<TemplateInfo | null>(null);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TEMPLATES.map((tpl) => {
          const isSelected = value === tpl.id;
          return (
            <div
              key={tpl.id}
              onClick={() => onChange(tpl.id)}
              className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden group ${
                isSelected
                  ? ""
                  : "border-gray-200 hover:border-gray-400"
              }`}
              style={isSelected ? { borderColor: tpl.accent, outlineColor: tpl.accent, outline: `3px solid ${tpl.accent}`, outlineOffset: "2px" } : {}}
            >
              {/* Preview thumbnail */}
              <div className="aspect-[3/4] p-0.5">
                <TemplatePreview tpl={tpl} />
              </div>

              {/* Label */}
              <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{tpl.name}</p>
                <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{tpl.style}</p>
              </div>

              {/* Selected badge */}
              {isSelected && (
                <div
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shadow"
                  style={{ background: tpl.accent }}
                >
                  ✓
                </div>
              )}

              {/* Preview button on hover */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreviewTpl(tpl); }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap"
              >
                Preview
              </button>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewTpl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewTpl(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">{previewTpl.name}</h3>
                <p className="text-sm text-gray-500">{previewTpl.style}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTpl(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Large preview */}
            <div className="p-5">
              <div
                className="mx-auto rounded-lg overflow-hidden border border-gray-200 shadow-inner"
                style={{ width: "100%", aspectRatio: "3/4" }}
              >
                <TemplatePreview tpl={previewTpl} />
              </div>
            </div>

            {/* Color palette strip */}
            <div className="px-5 pb-4">
              <p className="text-xs text-gray-500 mb-2">Color palette</p>
              <div className="flex gap-2">
                {[previewTpl.accent, previewTpl.dark, previewTpl.medium, ...(previewTpl.sidebar ? [previewTpl.sidebar] : [])].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white shadow" style={{ background: c }} title={c} />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2">
              <button
                type="button"
                onClick={() => { onChange(previewTpl.id); setPreviewTpl(null); }}
                className="flex-1 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: previewTpl.accent }}
              >
                Select this template
              </button>
              <button
                type="button"
                onClick={() => setPreviewTpl(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
