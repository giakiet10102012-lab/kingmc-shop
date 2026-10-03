import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KingMC Shop - Mua Bán Money Ingame",
  description: "Dịch vụ mua bán money Minecraft uy tín, tự động và nhanh chóng.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.className} bg-[#0a0a0f] text-zinc-100 antialiased min-h-screen flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
