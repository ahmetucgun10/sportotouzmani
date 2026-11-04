import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportAgent AI — Yapay Zeka Spor Analiz Platformu",
  description:
    "Çoklu ajan sistemi ile maç analizi, sakatlık takibi, form analizi ve tahmin üretimi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
