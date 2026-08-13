import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketingMind AI",
  description: "Marketing operations, SEO, CRM and profitability in one workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
