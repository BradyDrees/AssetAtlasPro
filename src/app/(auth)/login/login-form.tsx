"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

const REMEMBER_KEY = "asset-atlas-remember-me";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations();

  // Restore "remember me" preference + saved email on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const { remember, email: savedEmail } = JSON.parse(saved);
        if (remember) {
          setRememberMe(true);
          if (savedEmail) setEmail(savedEmail);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Save or clear "remember me" preference
      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ remember: true, email })
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      // Fetch active_role from profile to route correctly
      // If the user's active_role is "vendor", go to /vendor; otherwise /dashboard
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("active_role")
          .single();

        const activeRole = profile?.active_role;

        if (activeRole === "vendor") {
          // Set cookie for middleware routing (UX hint)
          document.cookie = `active_role=vendor; path=/; max-age=31536000; samesite=lax`;
          router.push("/vendor");
        } else {
          document.cookie = `active_role=${activeRole || "pm"}; path=/; max-age=31536000; samesite=lax`;
          router.push("/dashboard");
        }
      } catch {
        // Fallback: if profile query fails, go to dashboard
        router.push("/dashboard");
      }

      router.refresh();
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("auth.email")}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("auth.password")}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={rememberMe}
          onClick={() => setRememberMe((prev) => !prev)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            rememberMe ? "bg-brand-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
              rememberMe ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
        <label
          onClick={() => setRememberMe((prev) => !prev)}
          className="text-sm text-gray-600 cursor-pointer select-none"
        >
          {t("auth.keepLoggedIn")}
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-lg hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 transition-all font-medium shadow-md shadow-brand-500/20"
      >
        {loading ? t("auth.signingIn") : t("auth.signIn")}
      </button>
    </form>
  );
}
