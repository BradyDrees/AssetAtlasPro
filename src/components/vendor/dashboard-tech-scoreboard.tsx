"use client";

import { useTranslations } from "next-intl";

interface TechScore {
  user_id: string;
  name: string;
  jobs_completed: number;
  avg_rating: number | null;
}

interface DashboardTechScoreboardProps {
  scores: TechScore[];
}

export function DashboardTechScoreboard({ scores }: DashboardTechScoreboardProps) {
  const t = useTranslations("vendor.dashboard");

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <h3 className="text-lg font-semibold text-content-primary mb-4">{t("tech.title")}</h3>
      {scores.length === 0 ? (
        <p className="text-content-muted text-sm">{t("tech.noData")}</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-edge-secondary">
              <th className="text-left text-xs font-medium text-content-secondary pb-2">{t("tech.name")}</th>
              <th className="text-center text-xs font-medium text-content-secondary pb-2">{t("tech.completed")}</th>
              <th className="text-right text-xs font-medium text-content-secondary pb-2">{t("tech.rating")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-secondary">
            {scores.map((s) => (
              <tr key={s.user_id}>
                <td className="py-2 text-sm text-content-primary">{s.name}</td>
                <td className="py-2 text-sm text-content-secondary text-center">{s.jobs_completed}</td>
                <td className="py-2 text-sm text-right">
                  {s.avg_rating !== null ? (
                    <span className="text-gold-400">{s.avg_rating.toFixed(1)}</span>
                  ) : (
                    <span className="text-content-muted">{"—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}