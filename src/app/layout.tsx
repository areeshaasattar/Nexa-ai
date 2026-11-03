import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",

  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexa AI",
  description:
    "Nexa AI combines real-time video conferencing with an AI voice assistant. Create custom AI agents, schedule meetings, and talk to them live.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TRPCReactProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-white`}
      >
        <body
          className="min-h-full flex flex-col bg-white text-black"
          suppressHydrationWarning
        >
          {children}
          <Toaster richColors closeButton position="top-right" />
        </body>
      </html>
    </TRPCReactProvider>
  );
}
