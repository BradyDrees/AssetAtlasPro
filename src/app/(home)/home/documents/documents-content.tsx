"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  type HomeDocument,
  type DocumentCategory,
  DOCUMENT_CATEGORIES,
  DOCUMENT_SYSTEM_TYPES,
} from "@/lib/home/document-types";
import {
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
} from "@/app/actions/home-documents";

interface Props {
  initialDocuments: HomeDocument[];
  initialExpiring: HomeDocument[];
}

const CATEGORY_ICONS: Record<DocumentCategory, string> = {
  warranty: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  manual: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  contract: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  inspection_report: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z",
  insurance: "M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z",
  permit: "M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z",
  receipt: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
  other: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
};

export function DocumentVaultContent({ initialDocuments, initialExpiring }: Props) {
  const t = useTranslations("home.documents");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showUpload, setShowUpload] = useState(false);
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | "all">("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredDocs =
    filterCategory === "all"
      ? initialDocuments
      : initialDocuments.filter((d) => d.category === filterCategory);

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await uploadDocument(formData);
      if (result.success) {
        setShowUpload(false);
        setMsg(t("uploaded"));
        router.refresh();
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg(result.error ?? "Error");
        setTimeout(() => setMsg(null), 5000);
      }
    });
  };

  const handleDelete = (docId: string) => {
    startTransition(async () => {
      const result = await deleteDocument(docId);
      if (result.success) {
        setConfirmDeleteId(null);
        setMsg(t("deleted"));
        router.refresh();
        setTimeout(() => setMsg(null), 3000);
      }
    });
  };

  const handleView = (docId: string) => {
    startTransition(async () => {
      const { url } = await getDocumentUrl(docId);
      if (url) window.open(url, "_blank");
    });
  };

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <>
      {/* Status message */}
      {msg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm px-4 py-2 rounded-lg">
          {msg}
        </div>
      )}

      {/* Expiring Soon Section */}
      {initialExpiring.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("expiringSoon")}
          </h2>
          <div className="space-y-2">
            {initialExpiring.map((doc) => {
              const days = daysUntil(doc.expiration_date!);
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-surface-secondary rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[doc.category]} />
                    </svg>
                    <span className="text-sm text-content-primary truncate">{doc.name}</span>
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ml-2 ${days <= 0 ? "text-red-400" : "text-amber-400"}`}>
                    {days <= 0 ? t("expired") : t("expiresIn", { days })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar: Upload + Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | "all")}
            className="px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            <option value="all">{t("allCategories")}</option>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{t(cat)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t("upload")}
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-primary border border-edge-primary rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-content-primary">{t("upload")}</h3>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-content-tertiary mb-1">{t("name")}</label>
                <input name="name" required placeholder={t("namePlaceholder")} className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-tertiary mb-1">{t("category")}</label>
                <select name="category" required className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
                  <option value="">{t("selectCategory")}</option>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{t(cat)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-content-tertiary mb-1">{t("systemType")}</label>
                <select name="system_type" className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
                  <option value="">{t("systemTypeNone")}</option>
                  {DOCUMENT_SYSTEM_TYPES.map((st) => (
                    <option key={st} value={st}>{st.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-content-tertiary mb-1">{t("expirationDate")}</label>
                <input name="expiration_date" type="date" className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-tertiary mb-1">{t("description")}</label>
                <input name="description" placeholder={t("descriptionPlaceholder")} className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              </div>
              <div>
                <input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.docx" className="w-full text-sm text-content-tertiary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-rose-500/10 file:text-rose-400 hover:file:bg-rose-500/20" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-content-quaternary hover:text-content-tertiary">
                  {t("cancel")}
                </button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-700 text-white text-sm font-medium rounded-lg transition-colors">
                  {isPending ? t("uploading") : t("upload")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-primary border border-edge-primary rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-content-primary">{t("confirmDelete")}</h3>
            <p className="text-sm text-content-tertiary">{t("confirmDeleteDesc")}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm text-content-quaternary hover:text-content-tertiary">
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <svg className="w-10 h-10 mx-auto mb-2 text-content-quaternary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm text-content-quaternary">{t("noDocuments")}</p>
          <p className="text-xs text-content-quaternary mt-1">{t("noDocumentsDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-surface-primary rounded-xl border border-edge-primary p-4 flex items-center gap-4"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[doc.category]} />
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content-primary truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-content-quaternary">{t(doc.category)}</span>
                  {doc.system_type && (
                    <>
                      <span className="text-content-quaternary">·</span>
                      <span className="text-xs text-content-quaternary">{doc.system_type.replace(/_/g, " ")}</span>
                    </>
                  )}
                  {doc.file_size && (
                    <>
                      <span className="text-content-quaternary">·</span>
                      <span className="text-xs text-content-quaternary">
                        {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleView(doc.id)}
                  className="text-xs text-rose-500 hover:text-rose-400 font-medium"
                >
                  {t("view")}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(doc.id)}
                  className="text-xs text-content-quaternary hover:text-red-400"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
