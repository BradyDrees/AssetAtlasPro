"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getInspectionTerms } from "@/app/actions/inspection-findings";
import type { InspectionTerm } from "@/lib/inspection-types";

interface TermAutocompleteProps {
  termType: "category" | "location" | "tag";
  seedList: readonly string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Type-ahead autocomplete that merges seed terms + user-learned terms.
 * Learned terms rank higher (by use_count). User can type custom values.
 */
export function TermAutocomplete({
  termType,
  seedList,
  value,
  onChange,
  placeholder,
  className = "",
}: TermAutocompleteProps) {
  const t = useTranslations();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [learnedTerms, setLearnedTerms] = useState<InspectionTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch learned terms (debounced)
  const fetchTerms = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const terms = await getInspectionTerms(termType, q || undefined);
        setLearnedTerms(terms);
      } catch {
        // Offline or error — just use seeds
        setLearnedTerms([]);
      } finally {
        setLoading(false);
      }
    },
    [termType]
  );

  // On mount, load all terms
  useEffect(() => {
    fetchTerms("");
  }, [fetchTerms]);

  const handleInput = (val: string) => {
    setQuery(val);
    onChange(val);
    setOpen(true);

    // Debounce server fetch
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTerms(val);
    }, 200);
  };

  const selectTerm = (term: string) => {
    setQuery(term);
    onChange(term);
    setOpen(false);
    inputRef.current?.blur();
  };

  // Merge seed list + learned terms, dedupe, filter by query
  const suggestions = (() => {
    const learnedValues = new Set(learnedTerms.map((lt) => lt.term_value));
    const merged: { value: string; useCount: number }[] = [];

    // Learned terms first (already sorted by use_count desc)
    for (const lt of learnedTerms) {
      merged.push({ value: lt.term_value, useCount: lt.use_count });
    }

    // Then seeds not already in learned
    for (const seed of seedList) {
      if (!learnedValues.has(seed)) {
        merged.push({ value: seed, useCount: 0 });
      }
    }

    // Filter by query prefix
    const q = query.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((item) =>
      item.value.toLowerCase().startsWith(q)
    );
  })();

  const placeholderText =
    placeholder ??
    (termType === "category"
      ? t("inspection.autocomplete.placeholderCategory")
      : termType === "location"
        ? t("inspection.autocomplete.placeholderLocation")
        : t("inspection.autocomplete.placeholderTag"));

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholderText}
        className="w-full px-3 py-2.5 text-sm border border-edge-secondary rounded-lg bg-surface-primary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        autoComplete="off"
      />

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-surface-primary border border-edge-secondary rounded-lg shadow-lg">
          {suggestions.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => selectTerm(item.value)}
              className="w-full text-left px-3 py-2 text-sm text-content-primary hover:bg-surface-secondary transition-colors flex items-center justify-between"
            >
              <span>{item.value}</span>
              {item.useCount > 0 && (
                <span className="text-xs text-content-quaternary ml-2">
                  {item.useCount}×
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {loading && open && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
