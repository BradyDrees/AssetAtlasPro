"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSectionItem } from "@/app/actions/section-items";
import { Modal } from "@/components/modal";

interface AddSectionItemFormProps {
  projectId: string;
  projectSectionId: string;
  onClose: () => void;
}

export function AddSectionItemForm({
  projectId,
  projectSectionId,
  onClose,
}: AddSectionItemFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const itemId = await createSectionItem(
        {
          project_section_id: projectSectionId,
          name: name.trim(),
        },
        projectId
      );
      router.push(
        `/projects/${projectId}/sections/${projectSectionId}/items/${itemId}`
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create item";
      if (message.includes("duplicate") || message.includes("uq_section_item_name")) {
        setError("An item with this name already exists in this section");
      } else {
        setError(message);
      }
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Building A Roof, North Parking Lot"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md
                       hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create & Open"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
