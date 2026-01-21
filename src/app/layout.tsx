import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "chatcb-UI - إدارة واتساب للأعمال",
  description: "لوحة تحكم شاملة لإدارة واجهة برمجة تطبيقات واتساب للأعمال",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${tajawal.variable} antialiased font-sans`}
      >
        <ConvexClientProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
