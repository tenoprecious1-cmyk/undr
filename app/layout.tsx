import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNDR — The other side of Bowen",
  description: "Anonymous. Fast. Funny. Unfiltered. The internet Bowen students made for themselves.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
