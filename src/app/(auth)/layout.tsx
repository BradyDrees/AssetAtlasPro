import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-brand-950 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-600/8 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gold-500/5 rounded-full translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-brand-400/5 rounded-full" />

      <div className="relative w-full max-w-xl mx-4">
        {/* Brand header */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo-dark.png"
            alt="Asset Atlas Pro"
            width={900}
            height={400}
            className="h-72 md:h-96 w-auto mix-blend-lighten"
            priority
          />
        </div>

        {/* Card */}
        <div className="p-8 bg-white rounded-2xl shadow-2xl shadow-charcoal-950/40 border border-white/20">
          {children}
        </div>
      </div>
    </div>
  );
}
