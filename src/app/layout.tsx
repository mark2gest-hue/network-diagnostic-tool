import type { Metadata } from "next";
import { Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = Public_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

// Preferenza di sola interfaccia: applicata prima del primo paint.
const prefsBoot = `try{var t=localStorage.getItem('nd-theme')||'light',x=localStorage.getItem('nd-text');document.documentElement.dataset.theme=t;if(x==='large')document.documentElement.dataset.text='large'}catch(e){}`;

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
    <html lang="it" data-theme="light" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsBoot }} />
      </head>
      <body className="font-sans bg-background text-foreground min-h-screen">
        <main>{children}</main>
      </body>
    </html>
  );
}
