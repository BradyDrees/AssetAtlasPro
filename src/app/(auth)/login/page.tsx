import Link from "next/link";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6 text-brand-950">Sign In</h1>
      <LoginForm />
      <p className="text-center text-sm text-gray-600 mt-4">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-brand-600 hover:text-brand-800 font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
