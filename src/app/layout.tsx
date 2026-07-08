import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

// Heebo — גופן Hebrew-native נקי, מתאים ל-dashboard צפוף-מידע.
const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Niro — לידים להריסות",
  description: "מערכת לידים להריסות + CRM. כל הארץ, ממקורות פתוחים.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
