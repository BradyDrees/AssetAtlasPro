"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { updateSectionNotes } from "@/app/actions/captures";

interface SectionNotesProps {
  projectSectionId: string;
  projectId: string;
  initialNotes: string | null;
}

export function SectionNotes({
  projectSectionId,
  projectId,
  initialNotes,
}: SectionNotesProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(
    (value: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await updateSectionNotes(projectSectionId, projectId, value);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (err) {
          console.error("Section notes save failed:", err);
        } finally {
          setSaving(false);
        }
      }, 1000);
    },
    [projectSectionId, projectId]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
    debouncedSave(value);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-content-secondary mb-2">
        Section Notes
        {saving && (
          <span className="ml-2 text-xs font-normal text-content-muted">
            Saving...
          </span>
        )}
        {saved && !saving && (
          <span className="ml-2 text-xs font-normal text-green-500">
            Saved
          </span>
        )}
      </label>
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="General observations for this section..."
        rows={3}
        className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
      />
    </div>
  );
}
