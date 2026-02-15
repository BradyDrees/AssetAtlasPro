import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6 text-brand-950">Create Account</h1>
      <SignupForm />
      <p className="text-center text-sm text-gray-600 mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 hover:text-brand-800 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
