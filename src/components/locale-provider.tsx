"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Locale = "en" | "es";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function setLocaleCookie(value: Locale) {
  const isHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const secure = isHttps ? "; Secure" : "";
  document.cookie = `locale=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  // Keep <html lang> in sync client-side
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      setLocaleCookie(l);
      document.documentElement.lang = l;
      router.refresh();
    },
    [router]
  );

  const toggleLocale = useCallback(
    () => setLocale(locale === "en" ? "es" : "en"),
    [locale, setLocale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale }),
    [locale, setLocale, toggleLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useAppLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx)
    throw new Error("useAppLocale must be used within LocaleProvider");
  return ctx;
}
