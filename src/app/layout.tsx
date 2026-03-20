import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Network Diagnostic Tool",
  description: "Senior Network Diagnostic and IT Infrastructure Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-200 min-h-screen`}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
