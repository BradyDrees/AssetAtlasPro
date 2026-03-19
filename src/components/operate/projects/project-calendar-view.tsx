"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { OperateProject } from "@/app/actions/operate-projects";

interface ProjectCalendarViewProps {
  projects: OperateProject[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

const TYPE_COLORS: Record<string, string> = {
  unit_turn: "bg-blue-500",
  renovation: "bg-amber-500",
  capital: "bg-purple-500",
  seasonal: "bg-teal-500",
  custom: "bg-content-quaternary",
};

export function ProjectCalendarView({ projects, t }: ProjectCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Map projects by urgency_date
  const projectsByDate = useMemo(() => {
    const map = new Map<string, OperateProject[]>();
    for (const p of projects) {
      if (!p.urgency_date) continue;
      const dateStr = p.urgency_date;
      const arr = map.get(dateStr) ?? [];
      arr.push(p);
      map.set(dateStr, arr);
    }
    return map;
  }, [projects]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date().toISOString().split("T")[0];

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="bg-surface-secondary border border-edge-primary rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge-primary">
        <button onClick={prevMonth} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors">
          <svg className="w-5 h-5 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-content-primary font-semibold">{monthName}</h3>
        <button onClick={nextMonth} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors">
          <svg className="w-5 h-5 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-edge-primary">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center py-2 text-xs font-medium text-content-quaternary">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-24 border-b border-r border-edge-primary/50" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayProjects = projectsByDate.get(dateStr) ?? [];
          const isToday = dateStr === today;

          return (
            <div
              key={dateStr}
              className={`h-24 border-b border-r border-edge-primary/50 p-1 ${
                isToday ? "bg-green-500/5" : ""
              }`}
            >
              <div className={`text-xs mb-1 ${
                isToday
                  ? "text-green-400 font-bold"
                  : "text-content-quaternary"
              }`}>
                {day}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayProjects.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/operate/projects/${p.id}`}
                    className="block"
                  >
                    <div className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate hover:opacity-80 ${
                      TYPE_COLORS[p.project_type] ?? "bg-content-quaternary"
                    }/20`}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        TYPE_COLORS[p.project_type] ?? "bg-content-quaternary"
                      }`} />
                      <span className="text-content-secondary truncate">{p.title}</span>
                    </div>
                  </Link>
                ))}
                {dayProjects.length > 3 && (
                  <div className="text-[10px] text-content-quaternary px-1">
                    +{dayProjects.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
