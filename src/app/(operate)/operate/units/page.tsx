import { getOperateUnits, getUnitProperties } from "@/app/actions/operate-units";
import { UnitListShell } from "@/components/operate/units/unit-list-shell";
import { getLocale } from "next-intl/server";

export default async function OperateUnitsPage() {
  const locale = (await getLocale()) as "en" | "es";
  const messages = (await import(`@/messages/${locale}/operate-units.json`)).default;

  const [unitsResult, propertiesResult] = await Promise.all([
    getOperateUnits(),
    getUnitProperties(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <UnitListShell
        initialUnits={unitsResult.data}
        properties={propertiesResult.data}
        messages={messages}
      />
    </div>
  );
}
