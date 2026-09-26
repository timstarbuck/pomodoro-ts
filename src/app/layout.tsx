import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import metadataSnippet from "./metadata-snippet";
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
  title: "Pomodoro Timer | Focus and Break Timer",
  description:
    "Stay focused with a simple Pomodoro timer featuring customizable focus sessions, short breaks, and long breaks.",
  applicationName: "Pomodoro Timer",
  keywords: [
    "Pomodoro timer",
    "focus timer",
    "productivity",
    "study timer",
    "work timer",
  ],
  category: "productivity",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    title: "Pomodoro Timer | Focus and Break Timer",
    description:
      "Stay focused with customizable Pomodoro sessions and scheduled breaks.",
    siteName: "Pomodoro Timer",
  },
  twitter: {
    card: "summary",
    title: "Pomodoro Timer | Focus and Break Timer",
    description:
      "Stay focused with customizable Pomodoro sessions and scheduled breaks.",
  },
  ...metadataSnippet,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
