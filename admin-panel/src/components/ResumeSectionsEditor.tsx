"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  RESUME_SECTION_GROUPS,
  BULLET_COUNT_FIELDS,
  BULLET_MIN,
  BULLET_MAX,
  type BulletCountKey,
  type ResumeSectionKey,
  type ResumeSections,
} from "@/utils/resumeSections";

/**
 * Section / item visibility editor for the Resume template tab. One row per section with a switch;
 * the section's items (and, for work experience, the bullet counts) open underneath while it is on.
 */

interface Props {
  sections: ResumeSections;
  onToggle: (key: ResumeSectionKey, value: boolean) => void;
  onBulletCount: (key: BulletCountKey, value: number) => void;
  onReset: () => void;
  includeAchievements: boolean;
  onIncludeAchievements: (value: boolean) => void;
}

function RecommendedPill() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
      Recommended
    </span>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        checked ? "bg-primary-600" : "bg-gray-300",
      )}
    >
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

function Stepper({ value, onChange, label, disabled }: { value: number; onChange: (v: number) => void; label: string; disabled?: boolean }) {
  const btn = "flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent";
  return (
    <div className={cn("inline-flex items-center rounded-md border border-gray-300 bg-white", disabled && "opacity-50")}>
      <button type="button" className={cn(btn, "rounded-l-md")} aria-label={`Fewer ${label} bullets`} disabled={disabled || value <= BULLET_MIN} onClick={() => onChange(value - 1)}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 select-none border-x border-gray-200 text-center text-sm font-medium tabular-nums text-gray-900" aria-live="polite">
        {value}
      </span>
      <button type="button" className={cn(btn, "rounded-r-md")} aria-label={`More ${label} bullets`} disabled={disabled || value >= BULLET_MAX} onClick={() => onChange(value + 1)}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ResumeSectionsEditor({ sections, onToggle, onBulletCount, onReset, includeAchievements, onIncludeAchievements }: Props) {
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Resume Sections</h2>
          <p className="mt-1 text-sm text-gray-500">Choose what appears on this profile&apos;s resumes.</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to defaults
        </button>
      </div>

      <div className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {RESUME_SECTION_GROUPS.map((group) => {
          const on = group.key ? !!sections[group.key] : true;
          const shownItems = group.items.filter((i) => sections[i.key]).length;
          return (
            <section key={group.label} className={cn("px-4 py-3.5", !on && "bg-gray-50")}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={cn("text-sm font-semibold", on ? "text-gray-900" : "text-gray-500")}>{group.label}</h3>
                    {group.recommended && <RecommendedPill />}
                    {on && group.items.length > 0 && (
                      <span className="text-xs text-gray-400">{shownItems}/{group.items.length} shown</span>
                    )}
                  </div>
                  {group.description && <p className="mt-0.5 text-xs text-gray-500">{group.description}</p>}
                </div>
                {group.key && <Switch checked={on} onChange={(v) => onToggle(group.key as ResumeSectionKey, v)} label={group.label} />}
              </div>

              {on && group.items.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 rounded-md bg-gray-50 px-3 py-3 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <label key={item.key} className="flex cursor-pointer select-none items-start gap-2.5" title={item.hint}>
                      <input
                        type="checkbox"
                        checked={!!sections[item.key]}
                        onChange={(e) => onToggle(item.key, e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-800">
                          {item.label}
                          {item.recommended && <RecommendedPill />}
                        </span>
                        {item.hint && <span className="mt-0.5 block text-xs leading-snug text-gray-400">{item.hint}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {on && group.key === "work_experience" && (
                <div className="mt-3 rounded-md border border-dashed border-gray-200 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bullets per position</p>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {BULLET_COUNT_FIELDS.map((f) => (
                      <div key={f.key} className="flex items-center justify-between gap-3 sm:block">
                        <p className="text-sm text-gray-800 sm:mb-1.5">{f.label}</p>
                        <Stepper
                          label={f.label}
                          value={(sections[f.key] as number | undefined) ?? f.default}
                          disabled={!sections.work_bullets}
                          onChange={(v) => onBulletCount(f.key, v)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2.5 text-xs text-gray-400">
                    {sections.work_bullets
                      ? `Between ${BULLET_MIN} and ${BULLET_MAX}. Internships are included only when total work experience is 5 years or less.`
                      : "Turn on “Achievement bullets” to set bullet counts."}
                  </p>
                </div>
              )}
            </section>
          );
        })}

        <section className={cn("px-4 py-3.5", !includeAchievements && "bg-gray-50")}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className={cn("text-sm font-semibold", includeAchievements ? "text-gray-900" : "text-gray-500")}>Awards &amp; recognition</h3>
                <span className="rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-gray-500">Legacy API</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">Only used by the legacy generation API.</p>
            </div>
            <Switch checked={includeAchievements} onChange={onIncludeAchievements} label="Awards & recognition" />
          </div>
        </section>
      </div>
    </div>
  );
}
