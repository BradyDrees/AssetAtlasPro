import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  // During static generation (e.g. /_not-found), cookies() throws.
  // Fall back to "en" when no request context is available.
  let locale: "en" | "es" = "en";
  try {
    const cookieStore = await cookies();
    locale = cookieStore.get("locale")?.value === "es" ? "es" : "en";
  } catch {
    // Static generation — no request context
  }

  const messages = (await import(`../messages/${locale}.json`)).default;

  return { locale, messages };
});
