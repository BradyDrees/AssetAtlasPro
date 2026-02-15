"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { DDProjectForm } from "@/components/dd-project-form";

export function CreateDDProjectButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 border border-white/30 transition-all"
      >
        + New DD
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="New Due Diligence Project"
      >
        <DDProjectForm onClose={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
