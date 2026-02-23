import { getVendorWorkOrders } from "@/app/actions/vendor-work-orders";
import { ScheduleView } from "@/components/vendor/schedule-view";
import { getTranslations } from "next-intl/server";

export default async function VendorSchedulePage() {
  const t = await getTranslations("vendor.schedule");

  // Get all jobs that have a scheduled date
  const { data: allJobs } = await getVendorWorkOrders();
  const scheduledJobs = allJobs
    .filter((j) => j.scheduled_date)
    .map((j) => ({
      id: j.id,
      property_name: j.property_name,
      description: j.description,
      trade: j.trade,
      priority: j.priority,
      status: j.status,
      scheduled_date: j.scheduled_date,
      scheduled_time_start: j.scheduled_time_start,
      scheduled_time_end: j.scheduled_time_end,
    }));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-content-primary">
        {t("title")}
      </h1>
      <ScheduleView jobs={scheduledJobs} />
    </div>
  );
}
