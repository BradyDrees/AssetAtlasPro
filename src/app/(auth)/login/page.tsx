"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const t = useTranslations();
  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6 text-brand-950">{t("auth.signIn")}</h1>
      <LoginForm />
      <p className="text-center text-sm text-gray-600 mt-4">
        {t("auth.dontHaveAccount")}{" "}
        <Link href="/signup" className="text-brand-600 hover:text-brand-800 font-medium hover:underline">
          {t("auth.signUpLink")}
        </Link>
      </p>
    </>
  );
}
