"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  const t = useTranslations();
  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6 text-brand-950">{t("auth.signUp")}</h1>
      <SignupForm />
      <p className="text-center text-sm text-gray-600 mt-4">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-brand-600 hover:text-brand-800 font-medium hover:underline">
          {t("auth.signInLink")}
        </Link>
      </p>
    </>
  );
}
