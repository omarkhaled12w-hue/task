import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dentakay · Aufgaben",
  description: "Team-Aufgaben für Dentakay",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
