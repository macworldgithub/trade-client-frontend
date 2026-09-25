import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trade Client | Booran Motor Group",
  description: "Trade parts ordering and operations",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
