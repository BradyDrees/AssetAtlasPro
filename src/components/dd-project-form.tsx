"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDDProject, updateDDProject } from "@/app/actions/projects";
import type { DDProject } from "@/lib/types";

interface DDProjectFormProps {
  project?: DDProject;
  onClose: () => void;
}

export function DDProjectForm({ project, onClose }: DDProjectFormProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [propertyName, setPropertyName] = useState(
    project?.property_name ?? ""
  );
  const [address, setAddress] = useState(project?.address ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isEditing = !!project;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await updateDDProject(project.id, {
          name,
          property_name: propertyName,
          address,
        });
        onClose();
      } else {
        const projectId = await createDDProject({
          name,
          property_name: propertyName,
          address,
        });
        onClose();
        router.push(`/projects/${projectId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Project Code
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          required
          placeholder="VERIDIAN"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
        />
        <p className="text-xs text-gray-500 mt-1">
          Short identifier used in exports
        </p>
      </div>
      <div>
        <label
          htmlFor="propertyName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Property Name
        </label>
        <input
          id="propertyName"
          type="text"
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          required
          placeholder="Veridian Residences"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label
          htmlFor="address"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Address
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, Denver CO 80202"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
            ? "Save Changes"
            : "Create Due Diligence"}
        </button>
      </div>
    </form>
  );
}
