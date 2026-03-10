/**
 * SMS message templates for automated WO status notifications.
 * These are NOT i18n-managed — they go to external phone numbers
 * (tenants) in the tenant's preferred language.
 */

type SmsLocale = "en" | "es";

interface SmsVars {
  vendor_name?: string;
  date?: string;
  time?: string;
  property?: string;
}

const TEMPLATES: Record<string, Record<SmsLocale, string>> = {
  scheduled: {
    en: "Your service at {property} is scheduled for {date} at {time}. — {vendor_name}",
    es: "Su servicio en {property} está programado para {date} a las {time}. — {vendor_name}",
  },
  en_route: {
    en: "Your technician from {vendor_name} is on the way to {property}.",
    es: "Su técnico de {vendor_name} está en camino a {property}.",
  },
  on_site: {
    en: "Your technician from {vendor_name} has arrived at {property}.",
    es: "Su técnico de {vendor_name} ha llegado a {property}.",
  },
  completed: {
    en: "Your service at {property} has been completed. Thank you! — {vendor_name}",
    es: "Su servicio en {property} ha sido completado. ¡Gracias! — {vendor_name}",
  },
  appointment_reminder: {
    en: "Reminder: You have a service appointment at {property} tomorrow, {date} at {time}. — {vendor_name}",
    es: "Recordatorio: Tiene una cita de servicio en {property} mañana, {date} a las {time}. — {vendor_name}",
  },
};

export function getSmsTemplate(
  status: string,
  locale: SmsLocale,
  vars: SmsVars
): string | null {
  const template = TEMPLATES[status];
  if (!template) return null;

  let msg = template[locale] || template.en;
  if (vars.vendor_name) msg = msg.replace(/\{vendor_name\}/g, vars.vendor_name);
  if (vars.date) msg = msg.replace(/\{date\}/g, vars.date);
  if (vars.time) msg = msg.replace(/\{time\}/g, vars.time);
  if (vars.property) msg = msg.replace(/\{property\}/g, vars.property);

  // Clean up any remaining unreplaced vars
  msg = msg.replace(/\{[^}]+\}/g, "");

  return msg.trim();
}

export const SMS_CAPABLE_STATUSES = ["scheduled", "en_route", "on_site", "completed"];
