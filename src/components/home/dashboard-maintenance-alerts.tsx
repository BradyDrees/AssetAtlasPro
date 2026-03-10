"use client";

import { useState, useEffect } from "react";
import { getMaintenanceAlerts } from "@/app/actions/home-property";
import { MaintenanceAlertCard } from "./maintenance-alert-card";

export function DashboardMaintenanceAlerts() {
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      system_type: string;
      threshold_percent: number;
      source_snapshot: Record<string, unknown> | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getMaintenanceAlerts();
      setAlerts(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return null; // Don't show anything while loading
  if (alerts.length === 0) return null; // No alerts = no section

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <MaintenanceAlertCard
        alerts={alerts.map((a) => ({
          ...a,
          source_snapshot: a.source_snapshot as {
            age: number;
            minLifespan: number;
            thresholdAge: number;
          } | null,
        }))}
      />
    </div>
  );
}
