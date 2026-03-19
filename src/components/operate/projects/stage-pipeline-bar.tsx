"use client";

interface Stage {
  id: string;
  stage_name: string;
  sort_order: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
}

interface StagePipelineBarProps {
  stages: Stage[];
  currentStageId: string | null;
  /** Compact mode hides labels — used inside project cards */
  compact?: boolean;
}

const STATUS_CLASSES: Record<Stage["status"], { dot: string; line: string }> = {
  completed: {
    dot: "bg-green-500 ring-green-500/30",
    line: "bg-green-500",
  },
  in_progress: {
    dot: "bg-green-400 ring-green-400/40 animate-pulse",
    line: "bg-surface-tertiary",
  },
  pending: {
    dot: "bg-surface-tertiary ring-surface-tertiary/20",
    line: "bg-surface-tertiary",
  },
  skipped: {
    dot: "bg-charcoal-600 ring-charcoal-600/20",
    line: "bg-charcoal-700",
  },
};

export function StagePipelineBar({
  stages,
  currentStageId,
  compact = false,
}: StagePipelineBarProps) {
  const sorted = [...stages].sort((a, b) => a.sort_order - b.sort_order);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center w-full gap-0">
      {sorted.map((stage, idx) => {
        const isCurrent = stage.id === currentStageId;
        const classes = STATUS_CLASSES[stage.status];
        const isLast = idx === sorted.length - 1;

        return (
          <div
            key={stage.id}
            className={`flex items-center ${isLast ? "" : "flex-1"}`}
          >
            {/* Dot */}
            <div className="relative group flex flex-col items-center">
              <div
                className={`
                  ${compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"}
                  rounded-full ring-2 shrink-0 transition-all
                  ${classes.dot}
                  ${isCurrent ? "scale-125" : ""}
                  ${stage.status === "skipped" ? "opacity-50" : ""}
                `}
              />

              {/* Tooltip label (non-compact only) */}
              {!compact && (
                <span
                  className={`
                    absolute top-full mt-1.5 text-[10px] whitespace-nowrap
                    ${isCurrent ? "text-green-400 font-semibold" : "text-content-quaternary"}
                    ${stage.status === "skipped" ? "line-through opacity-60" : ""}
                  `}
                >
                  {stage.stage_name}
                </span>
              )}

              {/* Hover tooltip in compact mode */}
              {compact && (
                <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-10">
                  <div className="bg-surface-primary border border-edge-primary rounded px-2 py-1 text-[10px] text-content-secondary whitespace-nowrap shadow-lg">
                    {stage.stage_name}
                  </div>
                </div>
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`
                  flex-1 mx-1
                  ${compact ? "h-0.5" : "h-[2px]"}
                  rounded-full transition-colors
                  ${classes.line}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
