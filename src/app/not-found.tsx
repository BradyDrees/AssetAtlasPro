import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-brand-950 to-brand-900">
      <h1 className="text-8xl font-black text-brand-400/30 mb-2">404</h1>
      <p className="text-brand-200 mb-8 text-lg font-medium">Page not found</p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-xl hover:from-brand-700 hover:to-brand-800 transition-all font-semibold shadow-lg shadow-brand-500/25"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
