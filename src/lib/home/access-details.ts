/**
 * Shared helper: check whether a property has any access details filled in.
 * Used by: dashboard setup checklist, WO wizard gate, property validation.
 */

interface PropertyAccessFields {
  parking_instructions?: string | null;
  gate_code?: string | null;
  lockbox_code?: string | null;
  alarm_code?: string | null;
}

export function hasAccessDetails(property: PropertyAccessFields | null): boolean {
  if (!property) return false;
  return Boolean(
    property.parking_instructions?.trim() ||
    property.gate_code?.trim() ||
    property.lockbox_code?.trim() ||
    property.alarm_code?.trim()
  );
}
