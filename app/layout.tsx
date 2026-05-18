import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리 어디서 만나지",
  description: "친구 약속을 위한 실시간 만남 장소 추천 웹"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
