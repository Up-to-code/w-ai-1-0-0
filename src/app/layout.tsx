import type { Metadata } from "next";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const tajawal = Cairo({
  subsets: ["arabic",
    "latin"
  ],
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
        className={`${tajawal.className} antialiased font-sans`}
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
