import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // 1. Ini Judul yang tampil di Tab Browser
  title: "Bimbel Cerna - Cerdas & Bernalar",
  
  // 2. Ini deskripsi untuk SEO (Google Search)
  description: "Platform belajar modern dengan jurnal digital dan rekaman pembelajaran.",
  
  // 3. Ini untuk mengubah Logo kecil di Tab (Favicon)
  icons: {
    icon: '/logo.png', // Mengarah ke file yang ada di folder public
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}