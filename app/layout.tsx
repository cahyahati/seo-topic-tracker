import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Portfolio Dashboard",
  description: "Dashboard internal untuk memantau ranking, organic traffic, conversions, dan topic workflow lintas project SEO."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link href="/" className="brand">SEO Portfolio</Link>
              <nav className="main-nav" aria-label="Navigasi utama">
                <Link href="/performance">Performance</Link>
                <Link href="/dashboard">Topic Tracker</Link>
                <Link href="/settings">Pengaturan</Link>
              </nav>
            </div>
          </header>
          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
