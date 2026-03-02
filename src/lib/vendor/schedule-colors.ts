import type { ScheduleJob } from "@/lib/vendor/types";

export type ColorBy = "priority" | "status" | "trade";

function byPriority(job: ScheduleJob): string {
  switch (job.priority) {
    case "emergency":
      return "border-l-4 border-red-500 bg-red-500/10";
    case "urgent":
      return "border-l-4 border-yellow-500 bg-yellow-500/10";
    case "normal":
    default:
      return "border-l-4 border-brand-500 bg-brand-500/10";
  }
}

function byStatus(job: ScheduleJob): string {
  switch (job.status) {
    case "completed":
    case "done_pending_approval":
    case "paid":
      return "border-l-4 border-green-500 bg-green-500/10";
    case "in_progress":
    case "on_site":
    case "en_route":
      return "border-l-4 border-brand-500 bg-brand-500/10";
    case "assigned":
    case "accepted":
    case "scheduled":
      return "border-l-4 border-blue-500 bg-blue-500/10";
    case "declined":
    case "on_hold":
      return "border-l-4 border-red-500 bg-red-500/10";
    default:
      return "border-l-4 border-gray-400 bg-gray-400/10";
  }
}

function byTrade(job: ScheduleJob): string {
  const t = (job.trade || "").toLowerCase();
  if (t.includes("plumb")) return "border-l-4 border-blue-500 bg-blue-500/10";
  if (t.includes("elect")) return "border-l-4 border-yellow-500 bg-yellow-500/10";
  if (t.includes("hvac")) return "border-l-4 border-cyan-500 bg-cyan-500/10";
  if (t.includes("paint")) return "border-l-4 border-purple-500 bg-purple-500/10";
  if (t.includes("floor")) return "border-l-4 border-amber-500 bg-amber-500/10";
  if (t.includes("roof")) return "border-l-4 border-orange-500 bg-orange-500/10";
  return "border-l-4 border-gray-400 bg-gray-400/10";
}

export function getJobColor(job: ScheduleJob, colorBy: ColorBy): string {
  if (colorBy === "status") return byStatus(job);
  if (colorBy === "trade") return byTrade(job);
  return byPriority(job);
}
