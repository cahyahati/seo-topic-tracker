import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Topic Tracker",
  description: "Dashboard internal untuk tracking topic ideas, assignment writer, dan duplicate topic antar project SEO."
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
            <Link href="/" className="brand">
              SEO Topic Tracker
            </Link>
          </header>
          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
