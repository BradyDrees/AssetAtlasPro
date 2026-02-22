"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/modal";
import { DDProjectForm } from "@/components/dd-project-form";
import { DeleteProjectModal } from "@/components/delete-project-modal";
import type { DDProject } from "@/lib/types";

interface ProjectHeaderMenuProps {
  project: DDProject;
}

export function ProjectHeaderMenu({ project }: ProjectHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("dashboard");

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-content-muted hover:text-content-tertiary hover:bg-surface-tertiary rounded-lg transition-colors"
        aria-label={t("projectMenu")}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface-primary rounded-lg border border-edge-primary shadow-lg z-50 py-1">
          <button
            onClick={() => {
              setIsOpen(false);
              setShowEdit(true);
            }}
            className="w-full text-left px-4 py-2 text-sm text-content-secondary hover:bg-surface-secondary transition-colors"
          >
            {t("editProject")}
          </button>
          <a
            href={`/projects/${project.id}/review`}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-content-secondary hover:bg-surface-secondary transition-colors"
          >
            {t("reviewProject")}
          </a>
          <a
            href={`/projects/${project.id}/review`}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-content-secondary hover:bg-surface-secondary transition-colors"
          >
            {t("exportPDF")}
          </a>
          <hr className="my-1 border-edge-tertiary" />
          <button
            onClick={() => {
              setIsOpen(false);
              setShowDelete(true);
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            {t("deleteProject")}
          </button>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <Modal
          isOpen={true}
          onClose={() => setShowEdit(false)}
          title={t("editProject")}
        >
          <DDProjectForm
            project={project}
            onClose={() => setShowEdit(false)}
          />
        </Modal>
      )}

      {/* Delete modal */}
      {showDelete && (
        <DeleteProjectModal
          projectId={project.id}
          projectCode={project.name}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
