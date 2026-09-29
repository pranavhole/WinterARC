import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const title = "ARC — Build quietly. Become different.";
const description =
  "A personal 90-day Winter Arc tracker built around your goals, habits, and consistency.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: { default: title, template: "%s · ARC" },
  description,
  applicationName: "ARC",
  openGraph: { type: "website", siteName: "ARC", title, description, url: "/" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#F7F5F0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg font-sans text-fg">{children}</body>
    </html>
  );
}
