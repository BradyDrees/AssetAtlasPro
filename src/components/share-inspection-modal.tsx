"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  shareInspection,
  unshareInspection,
  getProjectShares,
} from "@/app/actions/inspection-shares";
import type { InspectionProjectShareWithProfile } from "@/lib/inspection-types";

interface ShareInspectionModalProps {
  projectId: string;
  projectCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareInspectionModal({
  projectId,
  projectCode,
  isOpen,
  onClose,
}: ShareInspectionModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shares, setShares] = useState<InspectionProjectShareWithProfile[]>([]);
  const [loadingShares, setLoadingShares] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Load existing shares when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingShares(true);
      getProjectShares(projectId)
        .then((data) => setShares(data))
        .catch(() => setShares([]))
        .finally(() => setLoadingShares(false));
    }
  }, [isOpen, projectId]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSharing(true);
    setError(null);
    setSuccess(null);

    try {
      await shareInspection(projectId, email);
      setSuccess(`Shared with ${email.trim()}`);
      setEmail("");
      // Refresh shares list
      const updated = await getProjectShares(projectId);
      setShares(updated);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setSharing(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    setRemovingId(shareId);
    setError(null);
    try {
      await unshareInspection(projectId, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share ${projectCode}`}>
      {/* Email input form */}
      <form onSubmit={handleShare} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            Invite by email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              placeholder="colleague@company.com"
              className="flex-1 px-3 py-2 border border-edge-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              disabled={sharing}
            />
            <button
              type="submit"
              disabled={sharing || !email.trim()}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {sharing ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 text-sm px-3 py-2 rounded-lg">
            {success}
          </div>
        )}
      </form>

      {/* Current collaborators */}
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-content-secondary mb-2">
          Collaborators
        </h3>

        {loadingShares ? (
          <p className="text-sm text-content-muted">Loading...</p>
        ) : shares.length === 0 ? (
          <p className="text-sm text-content-muted">
            No collaborators yet. Share this inspection to let others contribute.
          </p>
        ) : (
          <div className="space-y-2">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between bg-surface-secondary rounded-lg px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-content-primary truncate">
                    {share.profile.full_name || share.profile.email}
                  </p>
                  {share.profile.full_name && (
                    <p className="text-xs text-content-quaternary truncate">
                      {share.profile.email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-xs text-content-muted font-medium">
                    Collaborator
                  </span>
                  <button
                    onClick={() => handleRemove(share.id)}
                    disabled={removingId === share.id}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                  >
                    {removingId === share.id ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info note */}
      <p className="mt-4 text-xs text-content-muted">
        Collaborators can add findings and photos but cannot delete other
        people&apos;s inputs or change project settings.
      </p>
    </Modal>
  );
}
