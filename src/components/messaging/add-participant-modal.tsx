"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  searchContacts,
  getContacts,
  addParticipant,
} from "@/app/actions/messaging";
import type { UserContact, ParticipantRole } from "@/lib/messaging/types";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";

interface AddParticipantModalProps {
  threadId: string;
  existingParticipantIds: string[];
  product: Product;
  onAdded: () => void;
  onClose: () => void;
}

export function AddParticipantModal({
  threadId,
  existingParticipantIds,
  product,
  onAdded,
  onClose,
}: AddParticipantModalProps) {
  const t = useTranslations("messaging");
  const theme = productTheme[product];

  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const q = query.trim();
    const result = q ? await searchContacts(q) : await getContacts();
    if (!result.error) {
      // Filter out existing participants
      setContacts(
        result.data.filter(
          (c) => !existingParticipantIds.includes(c.contact_id)
        )
      );
    }
    setLoading(false);
  }, [query, existingParticipantIds]);

  useEffect(() => {
    const timer = setTimeout(loadContacts, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadContacts, query]);

  const handleAdd = async (contact: UserContact) => {
    if (adding) return;
    setAdding(contact.contact_id);
    setError(null);

    const role: ParticipantRole =
      (contact.contact_role as ParticipantRole) || "vendor";

    const result = await addParticipant({
      thread_id: threadId,
      user_id: contact.contact_id,
      role,
    });

    if (result.error) {
      setError(result.error);
    } else {
      // Remove from list and notify parent
      setContacts((prev) =>
        prev.filter((c) => c.contact_id !== contact.contact_id)
      );
      onAdded();
    }
    setAdding(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full md:max-w-md max-h-[80vh] bg-surface-primary rounded-t-2xl md:rounded-2xl flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge-primary flex-shrink-0">
          <h3 className="text-base font-semibold text-content-primary">
            {t("thread.addParticipant")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-content-tertiary hover:text-content-primary"
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
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-edge-secondary">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("contacts.search")}
            className="w-full px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-1 focus:ring-content-tertiary"
            autoFocus
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-content-quaternary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-sm text-content-tertiary">
              {t("contacts.noResults")}
            </div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleAdd(contact)}
                disabled={adding === contact.contact_id}
                className="w-full text-left px-4 py-3 border-b border-edge-secondary hover:bg-surface-secondary transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${theme.avatarBg} ${theme.avatarText}`}
                >
                  {(contact.contact_name?.[0] ?? "?").toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary truncate">
                    {contact.contact_name || t("contacts.unknown")}
                  </p>
                  {contact.contact_role && (
                    <p className="text-xs text-content-tertiary truncate">
                      {contact.contact_role}
                    </p>
                  )}
                </div>

                {/* Add indicator */}
                {adding === contact.contact_id ? (
                  <div className="w-5 h-5 border-2 border-content-quaternary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <svg
                    className={`w-5 h-5 flex-shrink-0 ${theme.accentText}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
