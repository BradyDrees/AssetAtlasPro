"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  generatePassportToken,
  revokePassportToken,
} from "@/app/actions/home-property";

interface PassportShareProps {
  currentToken: string | null;
}

export function PassportShare({ currentToken }: PassportShareProps) {
  const t = useTranslations("home.passport");
  const [token, setToken] = useState<string | null>(currentToken);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"generate" | "revoke" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const passportUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/passport/${token}`
    : null;

  const handleGenerate = () => {
    setAction("generate");
    startTransition(async () => {
      const result = await generatePassportToken();
      if (result.success && result.token) {
        setToken(result.token);
        setMessage(t("tokenActive"));
        setTimeout(() => setMessage(null), 3000);
      }
      setAction(null);
    });
  };

  const handleRevoke = () => {
    setAction("revoke");
    startTransition(async () => {
      const result = await revokePassportToken();
      if (result.success) {
        setToken(null);
        setMessage(t("tokenRevoked"));
        setTimeout(() => setMessage(null), 3000);
      }
      setAction(null);
    });
  };

  const handleCopy = async () => {
    if (!passportUrl) return;
    try {
      await navigator.clipboard.writeText(passportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = passportUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-rose-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-content-primary">
            {t("title")}
          </h2>
          <p className="text-xs text-content-quaternary">{t("subtitle")}</p>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
          {message}
        </div>
      )}

      {token && passportUrl ? (
        <div className="space-y-3">
          {/* Link display */}
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-sm text-content-tertiary truncate">
              {passportUrl}
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {copied ? t("copied") : t("copyLink")}
            </button>
          </div>

          {/* Revoke button */}
          <button
            onClick={handleRevoke}
            disabled={isPending}
            className="w-full py-2 bg-surface-secondary hover:bg-surface-tertiary border border-edge-secondary text-content-tertiary text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending && action === "revoke"
              ? t("revoking")
              : t("revokeToken")}
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-700 disabled:text-charcoal-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending && action === "generate"
            ? t("generating")
            : t("generateToken")}
        </button>
      )}
    </div>
  );
}
