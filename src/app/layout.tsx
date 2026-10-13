import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Sportoto Uzmanı",
  description: "15 maçlık sistem kuponu ve kapsama analizi",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
