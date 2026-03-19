/**
 * useFieldConfig — Returns field definitions for dynamic inline-editable forms.
 * Each field has a label, key, type, and optional metadata.
 */

export type FieldType = "text" | "number" | "date" | "select" | "textarea" | "email" | "tel";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  editable: boolean;
  section: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
  suffix?: string;
}

const UNIT_FIELDS: FieldConfig[] = [
  // Unit Info
  { key: "property_name", label: "propertyName", type: "text", editable: true, section: "unitInfo" },
  { key: "property_address", label: "propertyAddress", type: "text", editable: true, section: "unitInfo" },
  { key: "unit_number", label: "unitNumber", type: "text", editable: true, section: "unitInfo" },
  {
    key: "unit_type", label: "unitType", type: "select", editable: true, section: "unitInfo",
    options: [
      { value: "studio", label: "Studio" },
      { value: "1br", label: "1 BR" },
      { value: "2br", label: "2 BR" },
      { value: "3br", label: "3 BR" },
      { value: "4br", label: "4 BR" },
      { value: "other", label: "Other" },
    ],
  },
  {
    key: "status", label: "status", type: "select", editable: true, section: "unitInfo",
    options: [
      { value: "occupied", label: "Occupied" },
      { value: "vacant", label: "Vacant" },
      { value: "turn_in_progress", label: "Turn in Progress" },
      { value: "ready_to_lease", label: "Ready to Lease" },
    ],
  },
  { key: "beds", label: "beds", type: "number", editable: true, section: "unitInfo" },
  { key: "baths", label: "baths", type: "number", editable: true, section: "unitInfo" },
  { key: "sqft", label: "sqft", type: "number", editable: true, section: "unitInfo", suffix: "sq ft" },
  { key: "floor", label: "floor", type: "number", editable: true, section: "unitInfo" },
  // Tenant Info
  { key: "tenant_name", label: "tenantName", type: "text", editable: true, section: "tenantInfo" },
  { key: "tenant_email", label: "tenantEmail", type: "email", editable: true, section: "tenantInfo" },
  { key: "tenant_phone", label: "tenantPhone", type: "tel", editable: true, section: "tenantInfo" },
  // Lease Info
  { key: "lease_start", label: "leaseStart", type: "date", editable: true, section: "leaseInfo" },
  { key: "lease_end", label: "leaseEnd", type: "date", editable: true, section: "leaseInfo" },
  // Notes
  { key: "notes", label: "notes", type: "textarea", editable: true, section: "unitInfo" },
];

export function useFieldConfig(entity: "unit"): FieldConfig[] {
  switch (entity) {
    case "unit":
      return UNIT_FIELDS;
    default:
      return [];
  }
}

export function getFieldsBySection(fields: FieldConfig[]): Record<string, FieldConfig[]> {
  const sections: Record<string, FieldConfig[]> = {};
  for (const f of fields) {
    if (!sections[f.section]) sections[f.section] = [];
    sections[f.section].push(f);
  }
  return sections;
}
