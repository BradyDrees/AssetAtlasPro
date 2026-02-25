"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { updateProperty } from "@/app/actions/home-property";

interface PropertyData {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  property_type: string | null;
  year_built: number | null;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  hvac_model: string | null;
  hvac_age: number | null;
  water_heater_type: string | null;
  water_heater_age: number | null;
  electrical_panel: string | null;
  roof_material: string | null;
  roof_age: number | null;
  gate_code: string | null;
  lockbox_code: string | null;
  alarm_code: string | null;
  pet_warnings: string | null;
  parking_instructions: string | null;
}

interface PropertyContentProps {
  property: PropertyData | null;
}

export function PropertyContent({ property }: PropertyContentProps) {
  const t = useTranslations("home.property");
  const router = useRouter();
  const [editing, setEditing] = useState<"basic" | "systems" | "access" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  if (!property) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-content-tertiary">{t("noProperty")}</p>
        </div>
      </div>
    );
  }

  const handleSave = (section: "basic" | "systems" | "access", formData: FormData) => {
    startTransition(async () => {
      const input: Record<string, unknown> = { id: property.id };

      if (section === "basic") {
        input.address = formData.get("address") as string;
        input.city = (formData.get("city") as string) || null;
        input.state = (formData.get("state") as string) || null;
        input.zip = (formData.get("zip") as string) || null;
        input.property_type = (formData.get("property_type") as string) || null;
        input.year_built = formData.get("year_built") ? parseInt(formData.get("year_built") as string) : null;
        input.sqft = formData.get("sqft") ? parseInt(formData.get("sqft") as string) : null;
        input.beds = formData.get("beds") ? parseInt(formData.get("beds") as string) : null;
        input.baths = formData.get("baths") ? parseInt(formData.get("baths") as string) : null;
      } else if (section === "systems") {
        input.hvac_model = (formData.get("hvac_model") as string) || null;
        input.hvac_age = formData.get("hvac_age") ? parseInt(formData.get("hvac_age") as string) : null;
        input.water_heater_type = (formData.get("water_heater_type") as string) || null;
        input.water_heater_age = formData.get("water_heater_age") ? parseInt(formData.get("water_heater_age") as string) : null;
        input.electrical_panel = (formData.get("electrical_panel") as string) || null;
        input.roof_material = (formData.get("roof_material") as string) || null;
        input.roof_age = formData.get("roof_age") ? parseInt(formData.get("roof_age") as string) : null;
      } else if (section === "access") {
        input.gate_code = (formData.get("gate_code") as string) || null;
        input.lockbox_code = (formData.get("lockbox_code") as string) || null;
        input.alarm_code = (formData.get("alarm_code") as string) || null;
        input.pet_warnings = (formData.get("pet_warnings") as string) || null;
        input.parking_instructions = (formData.get("parking_instructions") as string) || null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await updateProperty(input as any);
      if (result.success) {
        setSaveMsg(t("saved"));
        setEditing(null);
        router.refresh();
        setTimeout(() => setSaveMsg(null), 3000);
      }
    });
  };

  const inputClass =
    "w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50";
  const labelClass = "block text-xs font-medium text-content-tertiary mb-1";
  const valueClass = "text-sm text-content-primary";
  const emptyClass = "text-sm text-content-quaternary italic";

  const propertyTypeLabels: Record<string, string> = {
    sfr: t("sfr"),
    condo: t("condo"),
    townhouse: t("townhouse"),
    duplex: t("duplex"),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
      </div>

      {saveMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm px-4 py-2 rounded-lg">
          {saveMsg}
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-content-primary">{t("basicInfo")}</h2>
          {editing !== "basic" ? (
            <button onClick={() => setEditing("basic")} className="text-sm text-rose-500 hover:text-rose-400 font-medium">
              {t("edit")}
            </button>
          ) : (
            <button onClick={() => setEditing(null)} className="text-sm text-content-quaternary hover:text-content-tertiary">
              {t("cancel")}
            </button>
          )}
        </div>

        {editing === "basic" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave("basic", new FormData(e.currentTarget));
            }}
            className="space-y-3"
          >
            <div>
              <label className={labelClass}>{t("address")}</label>
              <input name="address" defaultValue={property.address} className={inputClass} required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelClass}>{t("city")}</label><input name="city" defaultValue={property.city ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("state")}</label><input name="state" defaultValue={property.state ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("zip")}</label><input name="zip" defaultValue={property.zip ?? ""} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t("propertyType")}</label>
                <select name="property_type" defaultValue={property.property_type ?? ""} className={inputClass}>
                  <option value="">—</option>
                  <option value="sfr">{t("sfr")}</option>
                  <option value="condo">{t("condo")}</option>
                  <option value="townhouse">{t("townhouse")}</option>
                  <option value="duplex">{t("duplex")}</option>
                </select>
              </div>
              <div><label className={labelClass}>{t("yearBuilt")}</label><input name="year_built" type="number" defaultValue={property.year_built ?? ""} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelClass}>{t("sqft")}</label><input name="sqft" type="number" defaultValue={property.sqft ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("beds")}</label><input name="beds" type="number" defaultValue={property.beds ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("baths")}</label><input name="baths" type="number" defaultValue={property.baths ?? ""} className={inputClass} /></div>
            </div>
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-600 text-white text-sm font-medium rounded-lg transition-colors">
              {isPending ? t("saving") : t("save")}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div><p className={labelClass}>{t("address")}</p><p className={valueClass}>{property.address}</p></div>
            <div><p className={labelClass}>{t("city")}</p><p className={property.city ? valueClass : emptyClass}>{property.city ?? "—"}</p></div>
            <div><p className={labelClass}>{t("state")}</p><p className={property.state ? valueClass : emptyClass}>{property.state ?? "—"}</p></div>
            <div><p className={labelClass}>{t("zip")}</p><p className={property.zip ? valueClass : emptyClass}>{property.zip ?? "—"}</p></div>
            <div><p className={labelClass}>{t("propertyType")}</p><p className={property.property_type ? valueClass : emptyClass}>{property.property_type ? propertyTypeLabels[property.property_type] ?? property.property_type : "—"}</p></div>
            <div><p className={labelClass}>{t("yearBuilt")}</p><p className={property.year_built ? valueClass : emptyClass}>{property.year_built ?? "—"}</p></div>
            <div><p className={labelClass}>{t("sqft")}</p><p className={property.sqft ? valueClass : emptyClass}>{property.sqft ? `${property.sqft.toLocaleString()} sqft` : "—"}</p></div>
            <div><p className={labelClass}>{t("beds")}</p><p className={property.beds ? valueClass : emptyClass}>{property.beds ?? "—"}</p></div>
            <div><p className={labelClass}>{t("baths")}</p><p className={property.baths ? valueClass : emptyClass}>{property.baths ?? "—"}</p></div>
          </div>
        )}
      </div>

      {/* Systems */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-content-primary">{t("systems")}</h2>
            <p className="text-xs text-content-quaternary mt-0.5">{t("systemsDesc")}</p>
          </div>
          {editing !== "systems" ? (
            <button onClick={() => setEditing("systems")} className="text-sm text-rose-500 hover:text-rose-400 font-medium">
              {t("edit")}
            </button>
          ) : (
            <button onClick={() => setEditing(null)} className="text-sm text-content-quaternary hover:text-content-tertiary">
              {t("cancel")}
            </button>
          )}
        </div>

        {editing === "systems" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave("systems", new FormData(e.currentTarget));
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>{t("hvacModel")}</label><input name="hvac_model" defaultValue={property.hvac_model ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("hvacAge")}</label><input name="hvac_age" type="number" defaultValue={property.hvac_age ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("waterHeaterType")}</label><input name="water_heater_type" defaultValue={property.water_heater_type ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("waterHeaterAge")}</label><input name="water_heater_age" type="number" defaultValue={property.water_heater_age ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("electricalPanel")}</label><input name="electrical_panel" defaultValue={property.electrical_panel ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("roofMaterial")}</label><input name="roof_material" defaultValue={property.roof_material ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("roofAge")}</label><input name="roof_age" type="number" defaultValue={property.roof_age ?? ""} className={inputClass} /></div>
            </div>
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-600 text-white text-sm font-medium rounded-lg transition-colors">
              {isPending ? t("saving") : t("save")}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div><p className={labelClass}>{t("hvacModel")}</p><p className={property.hvac_model ? valueClass : emptyClass}>{property.hvac_model ?? "—"}</p></div>
            <div><p className={labelClass}>{t("hvacAge")}</p><p className={property.hvac_age ? valueClass : emptyClass}>{property.hvac_age ? `${property.hvac_age} yrs` : "—"}</p></div>
            <div><p className={labelClass}>{t("waterHeaterType")}</p><p className={property.water_heater_type ? valueClass : emptyClass}>{property.water_heater_type ?? "—"}</p></div>
            <div><p className={labelClass}>{t("waterHeaterAge")}</p><p className={property.water_heater_age ? valueClass : emptyClass}>{property.water_heater_age ? `${property.water_heater_age} yrs` : "—"}</p></div>
            <div><p className={labelClass}>{t("electricalPanel")}</p><p className={property.electrical_panel ? valueClass : emptyClass}>{property.electrical_panel ?? "—"}</p></div>
            <div><p className={labelClass}>{t("roofMaterial")}</p><p className={property.roof_material ? valueClass : emptyClass}>{property.roof_material ?? "—"}</p></div>
            <div><p className={labelClass}>{t("roofAge")}</p><p className={property.roof_age ? valueClass : emptyClass}>{property.roof_age ? `${property.roof_age} yrs` : "—"}</p></div>
          </div>
        )}
      </div>

      {/* Access & Instructions */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-content-primary">{t("access")}</h2>
            <p className="text-xs text-content-quaternary mt-0.5">{t("accessDesc")}</p>
          </div>
          {editing !== "access" ? (
            <button onClick={() => setEditing("access")} className="text-sm text-rose-500 hover:text-rose-400 font-medium">
              {t("edit")}
            </button>
          ) : (
            <button onClick={() => setEditing(null)} className="text-sm text-content-quaternary hover:text-content-tertiary">
              {t("cancel")}
            </button>
          )}
        </div>

        {editing === "access" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave("access", new FormData(e.currentTarget));
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelClass}>{t("gateCode")}</label><input name="gate_code" defaultValue={property.gate_code ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("lockboxCode")}</label><input name="lockbox_code" defaultValue={property.lockbox_code ?? ""} className={inputClass} /></div>
              <div><label className={labelClass}>{t("alarmCode")}</label><input name="alarm_code" defaultValue={property.alarm_code ?? ""} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>{t("petWarnings")}</label><input name="pet_warnings" defaultValue={property.pet_warnings ?? ""} className={inputClass} /></div>
            <div><label className={labelClass}>{t("parkingInstructions")}</label><input name="parking_instructions" defaultValue={property.parking_instructions ?? ""} className={inputClass} /></div>
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-600 text-white text-sm font-medium rounded-lg transition-colors">
              {isPending ? t("saving") : t("save")}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div><p className={labelClass}>{t("gateCode")}</p><p className={property.gate_code ? valueClass : emptyClass}>{property.gate_code ?? "—"}</p></div>
            <div><p className={labelClass}>{t("lockboxCode")}</p><p className={property.lockbox_code ? valueClass : emptyClass}>{property.lockbox_code ?? "—"}</p></div>
            <div><p className={labelClass}>{t("alarmCode")}</p><p className={property.alarm_code ? valueClass : emptyClass}>{property.alarm_code ?? "—"}</p></div>
            <div><p className={labelClass}>{t("petWarnings")}</p><p className={property.pet_warnings ? valueClass : emptyClass}>{property.pet_warnings ?? "—"}</p></div>
            <div className="col-span-2"><p className={labelClass}>{t("parkingInstructions")}</p><p className={property.parking_instructions ? valueClass : emptyClass}>{property.parking_instructions ?? "—"}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
