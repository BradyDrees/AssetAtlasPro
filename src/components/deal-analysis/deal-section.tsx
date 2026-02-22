"use client";

interface DealSectionProps {
  title: string;
  color?: string;
  children: React.ReactNode;
}

const colorMap: Record<string, string> = {
  brand: "border-l-brand-500 bg-brand-500/5",
  gold: "border-l-gold-500 bg-gold-500/5",
  green: "border-l-green-500 bg-green-500/5",
  red: "border-l-red-500 bg-red-500/5",
  purple: "border-l-purple-500 bg-purple-500/5",
  pink: "border-l-pink-500 bg-pink-500/5",
  blue: "border-l-blue-500 bg-blue-500/5",
  orange: "border-l-orange-500 bg-orange-500/5",
};

const textColorMap: Record<string, string> = {
  brand: "text-brand-500",
  gold: "text-gold-500",
  green: "text-green-500",
  red: "text-red-500",
  purple: "text-purple-500",
  pink: "text-pink-500",
  blue: "text-blue-500",
  orange: "text-orange-500",
};

export function DealSection({ title, color = "brand", children }: DealSectionProps) {
  return (
    <div className="mb-4">
      <div
        className={`px-4 py-2.5 border-l-3 rounded-r-md mb-1 ${
          colorMap[color] ?? colorMap.brand
        }`}
      >
        <h3
          className={`text-[11px] font-bold uppercase tracking-widest ${
            textColorMap[color] ?? textColorMap.brand
          }`}
        >
          {title}
        </h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}
