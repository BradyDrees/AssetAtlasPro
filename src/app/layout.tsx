import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://www.assetatlaspro.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Asset Atlas Pro — Real Estate Operations Platform",
    template: "%s | Asset Atlas Pro",
  },
  description:
    "Real estate operations platform — acquisitions & underwriting, property management & inspections, and contractor tools. Three products, one ecosystem.",
  keywords: [
    "real estate",
    "property management",
    "due diligence",
    "property inspections",
    "unit turns",
    "work orders",
    "contractor management",
    "multifamily",
    "asset management",
    "vendor management",
  ],
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Asset Atlas Pro",
    title: "Asset Atlas Pro — Acquire. Operate. Build Your Empire.",
    description:
      "Three products. One ecosystem. From the first property walk to the last invoice — Asset Atlas replaces your clipboard, your spreadsheets, and your fragmented tool stack.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Asset Atlas Pro — Real Estate Operations Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Asset Atlas Pro — Acquire. Operate. Build Your Empire.",
    description:
      "Real estate operations platform — acquisitions, property management, and contractor tools in one ecosystem.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Atlas Pro",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1a3a2a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased safe-area-bottom`}
      >
        {children}
        <PwaInstallPrompt />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
