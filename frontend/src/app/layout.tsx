import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShadowBuilder AI - Evidence-Backed Competitor Intelligence & Engineering Agent",
  description: "Researches public competitor evidence, ranks feature opportunities, generates specifications, and produces tested code patches.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
