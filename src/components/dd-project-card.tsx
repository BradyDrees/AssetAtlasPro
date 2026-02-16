"use client";

import Link from "next/link";
import type { DDProject } from "@/lib/types";

interface DDProjectCardProps {
  project: DDProject;
}

const statusStyles = {
  DRAFT: "bg-charcoal-100 text-charcoal-600",
  IN_PROGRESS: "bg-brand-100 text-brand-700",
  COMPLETE: "bg-brand-100 text-brand-800",
};

const borderColors = {
  DRAFT: "border-l-charcoal-400",
  IN_PROGRESS: "border-l-gold-500",
  COMPLETE: "border-l-brand-600",
};

const statusLabels = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

export function DDProjectCard({ project }: DDProjectCardProps) {
  const formattedDate = new Date(project.updated_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`block bg-white rounded-lg border border-gray-200 border-l-4 ${borderColors[project.status]} p-4 hover:shadow-lg hover:border-gray-300 transition-all`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{project.name}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[project.status]}`}
            >
              {statusLabels[project.status]}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">
            {project.property_name}
          </p>
          {project.address && (
            <p className="text-xs text-gray-400 mt-0.5">{project.address}</p>
          )}
          <span className="text-xs text-gray-400 mt-1 block md:hidden">
            {formattedDate}
          </span>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap ml-4 hidden md:block">
          {formattedDate}
        </span>
      </div>
    </Link>
  );
}
