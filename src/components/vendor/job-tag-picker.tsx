"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

interface JobTagPickerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

const TAG_COLORS = [
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "bg-green-500/20 text-green-400 border-green-500/30",
  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "bg-red-500/20 text-red-400 border-red-500/30",
  "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function JobTagPicker({
  tags,
  onChange,
  maxTags = 20,
  disabled = false,
}: JobTagPickerProps) {
  const t = useTranslations("vendor.jobs");
  const [inputValue, setInputValue] = useState("");

  const addTag = useCallback(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed || trimmed.length > 50) return;
    if (tags.length >= maxTags) return;
    if (tags.includes(trimmed)) {
      setInputValue("");
      return;
    }
    onChange([...tags, trimmed]);
    setInputValue("");
  }, [inputValue, tags, maxTags, onChange]);

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getTagColor(tag)}`}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:opacity-70 ml-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && tags.length < maxTags && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("tags.addPlaceholder")}
            className="flex-1 bg-surface-secondary border border-edge-primary rounded-lg px-3 py-1.5 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
            maxLength={50}
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
          >
            {t("tags.add")}
          </button>
        </div>
      )}
      {tags.length >= maxTags && (
        <p className="text-xs text-content-muted">{t("tags.maxReached")}</p>
      )}
    </div>
  );
}

/** Read-only tag display for cards */
export function JobTagChips({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getTagColor(tag)}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
