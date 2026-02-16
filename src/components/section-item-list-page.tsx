"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { SectionItemCard } from "@/components/section-item-card";
import { AddSectionItemForm } from "@/components/add-section-item-form";
import { NextSectionButton } from "@/components/next-section-button";
import type { DDSectionItem } from "@/lib/types";

interface SectionItemListPageProps {
  projectId: string;
  projectSectionId: string;
  projectName: string;
  sectionName: string;
  items: DDSectionItem[];
  captureCounts: Record<string, number>;
  nextSectionId: string | null;
  nextSectionName: string | null;
  groupSlug?: string;
}

export function SectionItemListPage({
  projectId,
  projectSectionId,
  projectName,
  sectionName,
  items,
  captureCounts,
  nextSectionId,
  nextSectionName,
  groupSlug,
}: SectionItemListPageProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteStart = useCallback(() => setIsDeleting(true), []);
  const handleDeleteEnd = useCallback(() => setIsDeleting(false), []);

  // Sort by sort_order then name
  const sortedItems = [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  return (
    <div className="pb-24">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-content-quaternary mb-4 flex-wrap">
        <Link
          href="/dashboard"
          className="hover:text-brand-600 transition-colors"
        >
          Projects
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${projectId}${groupSlug ? `?group=${groupSlug}` : ""}`}
          className="hover:text-brand-600 transition-colors"
        >
          {projectName}
        </Link>
        <span>/</span>
        <span className="text-content-primary">{sectionName}</span>
      </div>

      {/* Back button + Section header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}${groupSlug ? `?group=${groupSlug}` : ""}`}
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium mb-2 hover:text-brand-800 transition-colors"
        >
          <span>&larr;</span> Back to {projectName}
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">{sectionName}</h1>
        <p className="text-sm text-content-muted mt-0.5">
          {items.length} item{items.length !== 1 ? "s" : ""} inspected
        </p>
      </div>

      {/* Item list */}
      {sortedItems.length === 0 ? (
        <div className="bg-surface-primary rounded-lg border border-edge-primary p-8 text-center">
          <p className="text-content-quaternary text-sm">
            No items yet. Tap the + button to add your first item.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedItems.map((item) => (
            <SectionItemCard
              key={item.id}
              item={item}
              projectId={projectId}
              projectSectionId={projectSectionId}
              captureCount={captureCounts[item.id] ?? 0}
              isListBusy={isDeleting}
              onDeleteStart={handleDeleteStart}
              onDeleteEnd={handleDeleteEnd}
            />
          ))}
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-brand-600 text-white
                   rounded-full shadow-lg hover:bg-brand-700 active:bg-brand-800
                   flex items-center justify-center transition-colors text-3xl font-light"
        aria-label="Add item"
      >
        +
      </button>

      {/* Next section button */}
      {nextSectionId && nextSectionName && (
        <NextSectionButton
          projectId={projectId}
          nextSectionId={nextSectionId}
          nextSectionName={nextSectionName}
        />
      )}

      {/* Add item modal */}
      {showAddForm && (
        <AddSectionItemForm
          projectId={projectId}
          projectSectionId={projectSectionId}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
