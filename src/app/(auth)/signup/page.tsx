import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const t = await getTranslations();
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
