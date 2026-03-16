import { getPmWorkOrders } from "@/app/actions/pm-work-orders";
import { rescheduleJobAsPm } from "@/app/actions/pm-work-orders";
import { ScheduleView } from "@/components/vendor/schedule-view";
import { PageHeader } from "@/components/ui/page-header";
import { getTranslations } from "next-intl/server";
import {
  toScheduleJob,
  SCHEDULABLE_STATUSES,
  type WorkingHoursConfig,
} from "@/lib/vendor/types";

const DEFAULT_WORKING_HOURS: WorkingHoursConfig = {
  start: "08:00",
  end: "17:00",
  days: [1, 2, 3, 4, 5],
};

export default async function OperateSchedulePage() {
  const t = await getTranslations("vendor.schedule");

  const { data: allJobs } = await getPmWorkOrders();

  const mapped = allJobs.map(toScheduleJob);
  const scheduled = mapped.filter((j) => j.scheduled_date);
  const unscheduled = mapped.filter(
    (j) =>
      !j.scheduled_date &&
      SCHEDULABLE_STATUSES.includes(j.status as (typeof SCHEDULABLE_STATUSES)[number])
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ScheduleView
        jobs={scheduled}
        unscheduledJobs={unscheduled}
        workingHours={DEFAULT_WORKING_HOURS}
        tier="operate"
        rescheduleAction={rescheduleJobAsPm}
      />
    </div>
  );
}
