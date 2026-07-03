import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "구초뉴스",
  description: "CFD 중국우모협회 기준 거위털·오리털 국제 원료 시세",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
