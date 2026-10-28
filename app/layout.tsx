import type { Metadata } from "next";
import { APP_NAME } from '@/shared/config/application';
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Run image analyses and explore their results locally.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
