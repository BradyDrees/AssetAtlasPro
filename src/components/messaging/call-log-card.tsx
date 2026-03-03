"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { addCallNotes } from "@/app/actions/messaging";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";

interface CallLogCardProps {
  callId: string;
  direction: "inbound" | "outbound";
  status: string;
  durationSeconds: number | null;
  callerName: string | null;
  calleeName: string | null;
  isOwnCall: boolean;
  notes: string | null;
  voicemailTranscription: string | null;
  startedAt: string;
  product: Product;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCallTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CallLogCard({
  callId,
  direction,
  status,
  durationSeconds,
  callerName,
  calleeName,
  isOwnCall,
  notes,
  voicemailTranscription,
  startedAt,
  product,
}: CallLogCardProps) {
  const t = useTranslations("messaging");
  const theme = productTheme[product];

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState(notes);

  const isMissed =
    status === "no_answer" || status === "busy" || status === "canceled";
  const isVoicemail = status === "voicemail";
  const isCompleted = status === "completed" || status === "in_progress";

  const otherParty = isOwnCall ? calleeName : callerName;

  const handleSaveNotes = async () => {
    const trimmed = noteText.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const result = await addCallNotes({ call_id: callId, notes: trimmed });
    if (!result.error) {
      setSavedNotes(trimmed);
      setShowNoteInput(false);
      setNoteText("");
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-[85%] md:max-w-[65%] my-2">
      <div className="border border-edge-secondary rounded-xl px-4 py-3 bg-surface-secondary">
        {/* Call icon + info */}
        <div className="flex items-center gap-3">
          {/* Call direction icon */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              isMissed
                ? "bg-red-100 text-red-600"
                : isVoicemail
                ? "bg-amber-100 text-amber-600"
                : `${theme.avatarBg} ${theme.avatarText}`
            }`}
          >
            {isVoicemail ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            )}
          </div>

          {/* Call details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-content-primary truncate">
                {direction === "outbound" ? "↗" : "↙"}{" "}
                {otherParty || t("contacts.unknown")}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isMissed && (
                <span className="text-xs font-medium text-red-600">
                  {t("calls.missed")}
                </span>
              )}
              {isCompleted && durationSeconds != null && (
                <span className="text-xs text-content-tertiary">
                  {t("calls.duration")}: {formatDuration(durationSeconds)}
                </span>
              )}
              <span className="text-[10px] text-content-quaternary">
                {formatCallTime(startedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Voicemail transcription */}
        {isVoicemail && voicemailTranscription && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-surface-tertiary text-xs text-content-secondary italic">
            🎤 {voicemailTranscription}
          </div>
        )}

        {/* Saved notes */}
        {savedNotes && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-surface-tertiary text-xs text-content-secondary">
            📝 {savedNotes}
          </div>
        )}

        {/* Add notes section */}
        {!savedNotes && !showNoteInput && (
          <button
            onClick={() => setShowNoteInput(true)}
            className={`mt-2 text-xs ${theme.accentText} hover:underline`}
          >
            {t("calls.addNote")}
          </button>
        )}

        {showNoteInput && (
          <div className="mt-2 space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t("calls.addNote")}
              rows={2}
              className="w-full px-3 py-2 bg-surface-primary border border-edge-primary rounded-lg text-xs text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-1 focus:ring-content-tertiary resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowNoteInput(false);
                  setNoteText("");
                }}
                className="px-3 py-1 text-xs text-content-tertiary hover:text-content-primary"
              >
                {t("calls.cancel")}
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={!noteText.trim() || saving}
                className={`px-3 py-1 text-xs rounded-lg text-white ${theme.sendBg} disabled:opacity-40`}
              >
                {saving ? "..." : t("calls.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
