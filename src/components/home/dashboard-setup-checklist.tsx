"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { SetupProgress } from "@/app/actions/home-dashboard";

interface Props {
  progress: SetupProgress;
}

interface ChecklistStep {
  key: keyof SetupProgress;
  labelKey: string;
  descKey: string;
  href: string;
}

const STEPS: ChecklistStep[] = [
  {
    key: "propertyAdded",
    labelKey: "stepAddHome",
    descKey: "stepAddHomeDesc",
    href: "/home/onboarding",
  },
  {
    key: "accessDetailsAdded",
    labelKey: "stepAccessDetails",
    descKey: "stepAccessDetailsDesc",
    href: "/home/property",
  },
  {
    key: "systemsConfigured",
    labelKey: "stepSystems",
    descKey: "stepSystemsDesc",
    href: "/home/property",
  },
  {
    key: "firstWorkOrderCreated",
    labelKey: "stepFirstWo",
    descKey: "stepFirstWoDesc",
    href: "/home/work-orders/new",
  },
];

export function DashboardSetupChecklist({ progress }: Props) {
  const t = useTranslations("home.setup");

  const completedCount = STEPS.filter((s) => progress[s.key]).length;
  const total = STEPS.length;

  // All 4 complete → hide checklist
  if (completedCount === total) return null;

  const progressPercent = (completedCount / total) * 100;

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-rose-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-content-primary">
            {completedCount > 0 ? t("almostThere") : t("checklistTitle")}
          </h2>
          <p className="text-xs text-content-quaternary mt-0.5">
            {t("progress", { done: completedCount, total })}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface-secondary rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-rose-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = progress[step.key];
          return (
            <Link
              key={step.key}
              href={done ? "#" : step.href}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                done
                  ? "bg-surface-secondary/50 cursor-default"
                  : "bg-surface-secondary hover:bg-surface-tertiary"
              }`}
            >
              {/* Check circle */}
              <div
                className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${
                  done
                    ? "bg-green-500"
                    : "border-2 border-edge-secondary"
                }`}
              >
                {done && (
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    done
                      ? "text-content-quaternary line-through"
                      : "text-content-primary"
                  }`}
                >
                  {t(step.labelKey)}
                </p>
                <p className="text-xs text-content-quaternary mt-0.5">
                  {t(step.descKey)}
                </p>
              </div>

              {/* Arrow for incomplete */}
              {!done && (
                <svg
                  className="w-4 h-4 text-content-quaternary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
