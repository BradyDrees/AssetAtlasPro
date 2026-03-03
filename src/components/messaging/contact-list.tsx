"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getContacts, searchContacts, blockContact } from "@/app/actions/messaging";
import type { UserContact } from "@/lib/messaging/types";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";

interface ContactListProps {
  product: Product;
  onSelectContact: (contact: UserContact) => void;
  /** If true, shows as a picker (no block action) */
  pickerMode?: boolean;
}

export function ContactList({
  product,
  onSelectContact,
  pickerMode = false,
}: ContactListProps) {
  const t = useTranslations("messaging");
  const theme = productTheme[product];

  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const q = query.trim();
    const result = q
      ? await searchContacts(q)
      : await getContacts();
    if (!result.error) {
      setContacts(result.data);
    }
    setLoading(false);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(loadContacts, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadContacts, query]);

  const handleBlock = async (contactId: string) => {
    await blockContact(contactId);
    setContacts((prev) => prev.filter((c) => c.contact_id !== contactId));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-edge-primary">
        <h2 className="text-lg font-semibold text-content-primary mb-3">
          {t("contacts.title")}
        </h2>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-quaternary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("contacts.search")}
            className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-1 focus:ring-content-tertiary"
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-content-quaternary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <svg
              className="w-12 h-12 mb-3 text-content-quaternary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
            <p className="text-sm text-content-tertiary">
              {t("contacts.empty")}
            </p>
          </div>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              className="w-full text-left px-4 py-3 border-b border-edge-secondary hover:bg-surface-secondary transition-colors flex items-center gap-3"
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${theme.avatarBg} ${theme.avatarText}`}
              >
                {contact.contact_avatar_url ? (
                  <img
                    src={contact.contact_avatar_url}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (contact.contact_name?.[0] ?? "?").toUpperCase()
                )}
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
                {contact.contact_phone && (
                  <p className="text-xs text-content-quaternary truncate">
                    {contact.contact_phone}
                  </p>
                )}
              </div>

              {/* Source badge */}
              {contact.relationship_source && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-tertiary text-content-tertiary flex-shrink-0">
                  {contact.relationship_source === "work_order"
                    ? "WO"
                    : contact.relationship_source === "organization"
                    ? "ORG"
                    : ""}
                </span>
              )}

              {/* Block button (non-picker mode) */}
              {!pickerMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBlock(contact.contact_id);
                  }}
                  className="p-1.5 text-content-quaternary hover:text-red-500 transition-colors flex-shrink-0"
                  title={t("contacts.block")}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </button>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
