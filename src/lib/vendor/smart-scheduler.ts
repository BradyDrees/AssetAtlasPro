// ============================================
// Smart Scheduler — Pure Algorithm
// Groups unscheduled jobs by zip code proximity,
// schedules same-zip jobs back-to-back to minimize travel.
// ============================================

import type { ScheduleJob, WoPriority } from "./types";

// ---- Public Types ----

export interface SmartScheduleInput {
  unscheduledJobs: ScheduleJob[];
  existingSchedule: ScheduleJob[];
  targetDate: string; // YYYY-MM-DD
  workingHours: { start: string; end: string }; // "HH:MM"
  defaultDurationMinutes: number; // e.g. 60
  maxJobsPerDay?: number;
}

export interface ScheduleProposal {
  jobId: string;
  title: string;
  description: string;
  propertyZip: string;
  propertyAddress: string;
  trade: string;
  priority: WoPriority;
  scheduledDate: string;
  scheduledTime: string; // HH:MM
  endTime: string;       // HH:MM
  durationMinutes: number;
  zipGroup: string;
}

export interface UnschedulableJob {
  jobId: string;
  title: string;
  reason: "no_zip" | "no_time";
}

export interface ZipGroupSummary {
  zip: string;
  count: number;
}

export interface SmartScheduleResult {
  proposals: ScheduleProposal[];
  unschedulable: UnschedulableJob[];
  zipGroups: ZipGroupSummary[];
}

// ---- Helpers ----

const PRIORITY_ORDER: Record<WoPriority, number> = {
  emergency: 0,
  urgent: 1,
  normal: 2,
};

/** Parse "HH:MM" → minutes since midnight */
function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

/** Minutes since midnight → "HH:MM" */
function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Get highest priority in a list of jobs (lower index = higher) */
function groupPriorityScore(jobs: ScheduleJob[]): number {
  let best = 99;
  for (const j of jobs) {
    const score = PRIORITY_ORDER[j.priority] ?? 2;
    if (score < best) best = score;
  }
  return best;
}

/** Build a sorted set of occupied time ranges from existing scheduled jobs */
function buildOccupiedSlots(
  jobs: ScheduleJob[],
  targetDate: string
): { start: number; end: number }[] {
  const slots: { start: number; end: number }[] = [];

  for (const j of jobs) {
    if (j.scheduled_date !== targetDate) continue;
    if (!j.scheduled_time_start) continue;

    const start = parseHHMM(j.scheduled_time_start);
    if (start < 0) continue;

    let end: number;
    if (j.scheduled_time_end) {
      end = parseHHMM(j.scheduled_time_end);
      if (end < 0 || end <= start) end = start + 60; // fallback 1hr
    } else {
      end = start + 60; // default 1hr if no end time
    }

    slots.push({ start, end });
  }

  // Sort by start time
  slots.sort((a, b) => a.start - b.start);
  return slots;
}

/** Find the next available slot of `duration` minutes starting from `cursor`,
 *  that doesn't overlap any occupied slots and stays within working hours. */
function findNextSlot(
  cursor: number,
  duration: number,
  dayEnd: number,
  occupied: { start: number; end: number }[]
): number | null {
  let attempt = cursor;

  for (let safety = 0; safety < 200; safety++) {
    const proposedEnd = attempt + duration;

    // Past working hours?
    if (proposedEnd > dayEnd) return null;

    // Check overlap with occupied slots
    let conflict = false;
    for (const slot of occupied) {
      // Overlap if attempt < slot.end AND proposedEnd > slot.start
      if (attempt < slot.end && proposedEnd > slot.start) {
        // Jump cursor past this slot
        attempt = slot.end;
        conflict = true;
        break;
      }
    }

    if (!conflict) return attempt;
  }

  return null; // shouldn't happen but safety net
}

// ---- Main Algorithm ----

export function computeSmartSchedule(
  input: SmartScheduleInput
): SmartScheduleResult {
  const {
    unscheduledJobs,
    existingSchedule,
    targetDate,
    workingHours,
    defaultDurationMinutes,
    maxJobsPerDay,
  } = input;

  const dayStart = parseHHMM(workingHours.start);
  const dayEnd = parseHHMM(workingHours.end);

  // Fallback if working hours are invalid
  const effectiveStart = dayStart >= 0 ? dayStart : 8 * 60;  // 08:00
  const effectiveEnd = dayEnd > effectiveStart ? dayEnd : 17 * 60; // 17:00

  const proposals: ScheduleProposal[] = [];
  const unschedulable: UnschedulableJob[] = [];
  const zipGroupMap = new Map<string, ScheduleJob[]>();

  // 1. Separate jobs with/without zip codes
  for (const job of unscheduledJobs) {
    const zip = job.property_zip;
    if (!zip) {
      unschedulable.push({
        jobId: job.id,
        title: job.title,
        reason: "no_zip",
      });
      continue;
    }
    const group = zipGroupMap.get(zip) ?? [];
    group.push(job);
    zipGroupMap.set(zip, group);
  }

  // 2. Sort within each group by priority
  for (const [, group] of zipGroupMap) {
    group.sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
    );
  }

  // 3. Sort zip groups: highest priority first, then by group size (larger first)
  const sortedGroups = [...zipGroupMap.entries()].sort((a, b) => {
    const prioA = groupPriorityScore(a[1]);
    const prioB = groupPriorityScore(b[1]);
    if (prioA !== prioB) return prioA - prioB;
    return b[1].length - a[1].length; // larger groups first
  });

  // 4. Build occupied slots from existing schedule
  const occupied = buildOccupiedSlots(existingSchedule, targetDate);

  // 5. Schedule jobs — walk the timeline
  let cursor = effectiveStart;
  const duration = defaultDurationMinutes > 0 ? defaultDurationMinutes : 60;
  let scheduledCount = 0;
  const maxJobs = maxJobsPerDay ?? 999;

  for (const [zip, group] of sortedGroups) {
    for (const job of group) {
      if (scheduledCount >= maxJobs) {
        unschedulable.push({
          jobId: job.id,
          title: job.title,
          reason: "no_time",
        });
        continue;
      }

      const slotStart = findNextSlot(cursor, duration, effectiveEnd, occupied);

      if (slotStart === null) {
        unschedulable.push({
          jobId: job.id,
          title: job.title,
          reason: "no_time",
        });
        continue;
      }

      const slotEnd = slotStart + duration;

      proposals.push({
        jobId: job.id,
        title: job.title,
        description: job.propertyName || job.title,
        propertyZip: zip,
        propertyAddress: job.propertyName ?? "",
        trade: job.trade,
        priority: job.priority,
        scheduledDate: targetDate,
        scheduledTime: minutesToHHMM(slotStart),
        endTime: minutesToHHMM(slotEnd),
        durationMinutes: duration,
        zipGroup: zip,
      });

      // Mark this slot as occupied so subsequent jobs avoid it
      occupied.push({ start: slotStart, end: slotEnd });
      occupied.sort((a, b) => a.start - b.start);

      // Advance cursor past this slot (next job in same zip starts right after)
      cursor = slotEnd;
      scheduledCount++;
    }
  }

  // 6. Build zip group summary
  const zipGroups: ZipGroupSummary[] = sortedGroups.map(([zip, group]) => ({
    zip,
    count: group.length,
  }));

  return { proposals, unschedulable, zipGroups };
}
