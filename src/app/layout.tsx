import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Live S2S ELO — Evaluacion de Votos",
  description: "Herramienta de evaluacion de modelos de voz AI. Analiza justificaciones y genera votos alineados automaticamente.",
  keywords: ["S2S", "ELO", "AI Voice", "Evaluation", "Live S2S"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Live S2S ELO — Evaluacion de Votos",
    description: "Herramienta de evaluacion de modelos de voz AI",
    url: "https://chat.z.ai",
    siteName: "Live S2S ELO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Live S2S ELO — Evaluacion de Votos",
    description: "Herramienta de evaluacion de modelos de voz AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
