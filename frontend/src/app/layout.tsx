import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twin AI Infra - Infrastructure for AI Agents",
  description: "Automated infrastructure for AI agents with Circle payments and Azure VM provisioning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
