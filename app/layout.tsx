import type { Metadata } from "next";
import KakaoScript from "./kakao-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "자가운전대장",
  description: "자가운전대장 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <KakaoScript />
        {children}
      </body>
    </html>
  );
}
