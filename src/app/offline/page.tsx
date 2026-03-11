"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-charcoal-950 px-6">
      <div className="text-center max-w-sm">
        {/* Offline icon */}
        <div className="w-20 h-20 rounded-full bg-charcoal-800 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-charcoal-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          You&apos;re Offline
        </h1>
        <p className="text-sm text-charcoal-400 mb-8">
          It looks like you&apos;ve lost your internet connection. Check your connection and try again.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Try Again
        </button>
      </div>
    </div>
  );
}
