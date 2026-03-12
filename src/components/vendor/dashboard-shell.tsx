"use client";

import { type ReactNode, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardDateFilter } from "@/components/vendor/dashboard-date-filter";

type DashboardRange = "today" | "week" | "month" | "quarter";

interface DashboardShellProps {
  range: DashboardRange;
  children: ReactNode;
}

export function DashboardShell({ range, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleRangeChange = useCallback(
    (nextRange: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextRange === "month") {
        params.delete("range");
      } else {
        params.set("range", nextRange);
      }

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <DashboardDateFilter value={range} onChange={handleRangeChange} />
      {children}
    </div>
  );
}
