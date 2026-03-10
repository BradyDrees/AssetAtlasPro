import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  getPmWorkOrderSummary,
  getPmWorkOrderPhotos,
  getPmWorkOrderTimeLog,
  getPmWorkOrderFinancials,
  getPmWorkOrderActivity,
} from "@/app/actions/pm-work-orders";
import { WoDetailContent } from "@/components/operate/wo-detail-content";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OperateWorkOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations("operate.workOrders");

  // Parallel data fetches (split fetchers)
  const [summaryRes, photosRes, timeLogRes, financialsRes, activityRes] =
    await Promise.all([
      getPmWorkOrderSummary(id),
      getPmWorkOrderPhotos(id),
      getPmWorkOrderTimeLog(id),
      getPmWorkOrderFinancials(id),
      getPmWorkOrderActivity(id),
    ]);

  if (summaryRes.error || !summaryRes.data) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <WoDetailContent
        wo={summaryRes.data}
        photos={photosRes.data}
        timeLog={timeLogRes.data}
        financials={financialsRes.data}
        activity={activityRes.data}
      />
    </div>
  );
}
