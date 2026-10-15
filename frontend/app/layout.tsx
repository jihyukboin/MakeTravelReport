import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendardGov = localFont({
  src: "./fonts/PretendardGOVVariable.woff2",
  variable: "--font-pretendard-gov",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MakeTravelReport · EnjoyTrip",
  description: "여행 취향과 전기차 배터리, 가까운 충전소를 고려해 나만의 여행 계획서를 만드세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendardGov.variable} h-full antialiased`}>
      <body className="flex h-dvh flex-col overflow-hidden">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
          본문 바로가기
        </a>
        {children}
      </body>
    </html>
  );
}
