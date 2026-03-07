"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CredentialType } from "@/lib/vendor/types";
import {
  createCredential,
  uploadCredentialFile,
} from "@/app/actions/vendor-profile";

const CREDENTIAL_TYPES: CredentialType[] = [
  "insurance_gl",
  "insurance_wc",
  "license",
  "w9",
  "certification",
  "bond",
  "other",
];

interface CredentialUploadProps {
  open: boolean;
  onClose: () => void;
}

export function CredentialUpload({ open, onClose }: CredentialUploadProps) {
  const t = useTranslations("vendor.profile");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [credType, setCredType] = useState<CredentialType>("insurance_gl");
  const [name, setName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setCredType("insurance_gl");
    setName("");
    setDocumentNumber("");
    setIssuedDate("");
    setExpirationDate("");
    setNotes("");
    setFile(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) setFile(selected);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError(t("credentials.nameRequired"));
      return;
    }

    // Validate issued_date < expiration_date when both are provided
    if (issuedDate && expirationDate && issuedDate >= expirationDate) {
      setError(t("credentials.dateError"));
      return;
    }

    setSaving(true);
    setError(null);

    // 1. Create the credential record
    const { credential, error: createError } = await createCredential({
      type: credType,
      name: name.trim(),
      document_number: documentNumber.trim() || undefined,
      issued_date: issuedDate || undefined,
      expiration_date: expirationDate || undefined,
      notes: notes.trim() || undefined,
    });

    if (createError || !credential) {
      setError(createError ?? t("credentials.createError"));
      setSaving(false);
      return;
    }

    // 2. Upload the file if provided
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const { error: uploadError } = await uploadCredentialFile(
        credential.id,
        formData
      );
      if (uploadError) {
        setError(uploadError);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    startTransition(() => router.refresh());
    handleClose();
  }, [
    name, credType, documentNumber, issuedDate, expirationDate, notes,
    file, t, router, handleClose,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-primary rounded-2xl border border-edge-primary shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-edge-primary bg-surface-primary rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-content-primary">
            {t("credentials.upload")}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              {t("credentials.type")}
            </label>
            <select
              value={credType}
              onChange={(e) => setCredType(e.target.value as CredentialType)}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary"
            >
              {CREDENTIAL_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {t(`credentials.types.${ct}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              {t("credentials.name")} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("credentials.namePlaceholder")}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary placeholder:text-content-quaternary"
            />
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              {t("credentials.number")}
            </label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder={t("credentials.numberPlaceholder")}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary placeholder:text-content-quaternary"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1.5">
                {t("credentials.issued")}
              </label>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1.5">
                {t("credentials.expires")}
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              {t("credentials.notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t("credentials.notesPlaceholder")}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary placeholder:text-content-quaternary resize-none"
            />
          </div>

          {/* File Drop Zone */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              {t("credentials.file")}
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
                dragOver
                  ? "border-brand-500 bg-brand-500/5"
                  : file
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-edge-secondary hover:border-edge-primary bg-surface-secondary/50"
              }`}
            >
              {file ? (
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium text-content-primary truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-content-quaternary">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="p-1 rounded hover:bg-surface-tertiary text-content-tertiary"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-content-quaternary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-content-tertiary text-center">
                    {t("credentials.dropFile")}
                  </p>
                  <p className="text-xs text-content-quaternary mt-1">
                    {t("credentials.fileFormats")}
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-edge-primary bg-surface-primary rounded-b-2xl">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg text-sm text-content-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50"
          >
            {t("credentials.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || isPending || !name.trim()}
            className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? t("credentials.saving") : t("credentials.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
