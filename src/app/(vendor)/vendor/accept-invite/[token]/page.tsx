"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { acceptInvite } from "@/app/actions/vendor-invites";

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const t = useTranslations("vendor.clients");
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function process() {
      const { token } = await params;
      const result = await acceptInvite(token);
      if (result.success) {
        setStatus("success");
        setTimeout(() => router.push("/vendor/clients"), 2000);
      } else {
        setStatus("error");
        setError(result.error ?? t("invite.unknownError"));
      }
    }
    process();
  }, [params, router, t]);

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-surface-primary rounded-2xl border border-edge-primary p-8 text-center">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-content-primary">{t("invite.processing")}</h1>
            <p className="text-sm text-content-tertiary mt-1">{t("invite.verifying")}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-content-primary">{t("invite.accepted")}</h1>
            <p className="text-sm text-content-tertiary mt-1">{t("invite.redirecting")}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-content-primary">{t("invite.failed")}</h1>
            <p className="text-sm text-red-400 mt-1">{error}</p>
            <button
              onClick={() => router.push("/vendor")}
              className="mt-4 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium"
            >
              {t("invite.goToDashboard")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
