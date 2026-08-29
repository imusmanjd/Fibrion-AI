import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fibrion AI",
  description: "Industrial intelligence for smarter manufacturing.",
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