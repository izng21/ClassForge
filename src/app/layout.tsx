import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import AppFrame from "@/components/AppFrame";
import { getSession } from "@/lib/auth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClassForge",
  description: "Bulk announcements, activities, and grade distribution for your classes.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <AppFrame navigation={<Nav />} hasSession={Boolean(session)}>
          {children}
        </AppFrame>
      </body>
    </html>
  );
}
