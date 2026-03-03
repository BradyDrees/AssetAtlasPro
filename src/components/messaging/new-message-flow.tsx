"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createDMThread } from "@/app/actions/messaging";
import type { UserContact } from "@/lib/messaging/types";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";
import { ContactList } from "./contact-list";

interface NewMessageFlowProps {
  product: Product;
  onThreadCreated: (threadId: string) => void;
  onClose: () => void;
}

/**
 * New message flow: pick a contact → create or open DM thread.
 * Opens as a full-screen overlay on mobile, side panel on desktop.
 */
export function NewMessageFlow({
  product,
  onThreadCreated,
  onClose,
}: NewMessageFlowProps) {
  const t = useTranslations("messaging");
  const theme = productTheme[product];
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectContact = useCallback(
    async (contact: UserContact) => {
      if (creating) return;
      setCreating(true);
      setError(null);

      try {
        const result = await createDMThread(contact.contact_id);
        onThreadCreated(result.thread_id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create conversation"
        );
        setCreating(false);
      }
    },
    [creating, onThreadCreated]
  );

  return (
    <div className="fixed inset-0 z-50 bg-surface-primary md:relative md:inset-auto md:z-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-edge-primary flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1 -ml-1 text-content-tertiary hover:text-content-primary"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-content-primary">
          {t("inbox.newMessage")}
        </h2>
        {creating && (
          <div className="ml-auto">
            <div className="w-5 h-5 border-2 border-content-quaternary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Contact picker */}
      <div className="flex-1 overflow-hidden">
        <ContactList
          product={product}
          onSelectContact={handleSelectContact}
          pickerMode
        />
      </div>
    </div>
  );
}
