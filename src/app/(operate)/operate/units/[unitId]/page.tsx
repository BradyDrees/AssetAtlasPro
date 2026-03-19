import { getOperateUnit } from "@/app/actions/operate-units";
import { UnitDetailShell } from "@/components/operate/units/unit-detail-shell";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ unitId: string }>;
}

export default async function OperateUnitDetailPage({ params }: Props) {
  const { unitId } = await params;
  const locale = (await getLocale()) as "en" | "es";
  const messages = (
    await import(`@/messages/${locale}/operate-units.json`)
  ).default;

  const result = await getOperateUnit(unitId);

  if (result.error || !result.data) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <UnitDetailShell unit={result.data} messages={messages} />
    </div>
  );
}
