import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import MainLayout from "@/components/common/MainLayout";

export const metadata: Metadata = {
  title: "학교 출석 관리 시스템",
  description: "학과/학기/과목 단위 출석 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <SessionProvider>
          <MainLayout>{children}</MainLayout>
        </SessionProvider>
      </body>
    </html>
  );
}

