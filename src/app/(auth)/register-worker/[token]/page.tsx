"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  lookupWorkerInvite,
  acceptWorkerInvite,
  type InviteLookup,
} from "@/app/actions/vendor-worker-invites";

interface RegisterWorkerPageProps {
  params: Promise<{ token: string }>;
}

export default function RegisterWorkerPage({ params }: RegisterWorkerPageProps) {
  const router = useRouter();
  const t = useTranslations("vendor.workers");

  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<InviteLookup | null>(null);
  const [status, setStatus] = useState<"loading" | "show_options" | "register" | "accepting" | "success" | "error">("loading");
  const [error, setError] = useState("");

  // Registration form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registering, setRegistering] = useState(false);

  // Resolve params and lookup invite
  useEffect(() => {
    async function init() {
      const { token: rawToken } = await params;
      setToken(rawToken);

      const result = await lookupWorkerInvite(rawToken);
      if (!result.data) {
        setError(t("invite.invalid"));
        setStatus("error");
        return;
      }

      const inv = result.data;

      // Check if expired
      if (new Date(inv.invite_expires_at) < new Date()) {
        setError(t("invite.expired"));
        setStatus("error");
        return;
      }

      // Check if consumed
      if (inv.invite_consumed) {
        setError(t("invite.alreadyUsed"));
        setStatus("error");
        return;
      }

      // Check if revoked
      if (inv.revoked_at) {
        setError(t("invite.revoked"));
        setStatus("error");
        return;
      }

      setInvite(inv);

      // Check if user is authenticated
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Authenticated — check email match
        if (user.email?.toLowerCase() === inv.email.toLowerCase()) {
          // Auto-accept
          setStatus("accepting");
          const acceptResult = await acceptWorkerInvite(rawToken);
          if (acceptResult.success) {
            setStatus("success");
            setTimeout(() => {
              document.cookie = "active_role=vendor; path=/; max-age=31536000; samesite=lax";
              router.push("/pro");
            }, 2000);
          } else {
            setError(acceptResult.error || t("invite.failed"));
            setStatus("error");
          }
        } else {
          // Email mismatch
          setError(
            t("invite.emailMismatch", {
              inviteEmail: inv.email,
              currentEmail: user.email || "",
            })
          );
          setStatus("error");
        }
      } else {
        // Not authenticated — show options
        setStatus("show_options");
      }
    }
    init();
  }, [params, router, t]);

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registering || !invite) return;

    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("register.passwordTooShort"));
      return;
    }

    setRegistering(true);
    setError("");

    try {
      const supabase = createClient();

      // Create account
      const { error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setRegistering(false);
        return;
      }

      // Accept invite
      setStatus("accepting");
      const acceptResult = await acceptWorkerInvite(token);
      if (acceptResult.success) {
        setStatus("success");
        setTimeout(() => {
          document.cookie = "active_role=vendor; path=/; max-age=31536000; samesite=lax";
          router.push("/pro");
        }, 2000);
      } else {
        setError(acceptResult.error || t("invite.failed"));
        setStatus("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invite.failed"));
      setStatus("error");
    } finally {
      setRegistering(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-content-secondary text-sm">{t("invite.verifying")}</p>
        </div>
      </div>
    );
  }

  // Accepting state
  if (status === "accepting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-content-secondary text-sm">{t("invite.processing")}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{t("invite.accepted")}</h2>
          <p className="text-content-tertiary text-sm">{t("invite.redirecting")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{t("invite.failed")}</h2>
          <p className="text-content-tertiary text-sm mb-6">{error}</p>
          <a
            href="/pro"
            className="inline-block px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-500"
          >
            {t("invite.goToDashboard")}
          </a>
        </div>
      </div>
    );
  }

  // Show options: sign in or create account
  const roleLabel = invite?.role === "admin"
    ? t("invite.roleAdmin")
    : invite?.role === "office_manager"
      ? t("invite.roleOfficeManager")
      : t("invite.roleTech");

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            {t("register.title", { orgName: invite?.org_name || "" })}
          </h1>
          <p className="text-content-tertiary mt-2">
            {t("register.subtitle", { role: roleLabel })}
          </p>
        </div>

        {/* Registration form */}
        {status === "register" || status === "show_options" ? (
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 space-y-4">
            {status === "show_options" && (
              <>
                <p className="text-sm text-content-secondary text-center mb-4">
                  {t("register.alreadyHaveAccount")}{" "}
                  <a
                    href={`/login?redirect=/register-worker/${token}`}
                    className="text-brand-500 hover:text-brand-400 font-medium"
                  >
                    {t("register.signIn")}
                  </a>
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-edge-secondary" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-surface-primary text-content-quaternary">
                      {t("register.orCreateAccount")}
                    </span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-content-tertiary mb-1">
                    {t("register.firstName")}
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-primary rounded-lg text-content-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-content-tertiary mb-1">
                    {t("register.lastName")}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-primary rounded-lg text-content-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-content-tertiary mb-1">
                  {t("register.email")}
                </label>
                <input
                  type="email"
                  value={invite?.email || ""}
                  disabled
                  className="w-full px-3 py-2 text-sm bg-surface-tertiary border border-edge-primary rounded-lg text-content-quaternary"
                />
              </div>

              <div>
                <label className="block text-xs text-content-tertiary mb-1">
                  {t("register.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-primary rounded-lg text-content-primary"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs text-content-tertiary mb-1">
                  {t("register.confirmPassword")}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-primary rounded-lg text-content-primary"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={registering}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-500 disabled:opacity-40 transition-colors"
              >
                {registering ? t("register.creating") : t("register.createAccount")}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
