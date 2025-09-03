import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'SureSlip',
  description: 'SureSlip — quick competitions and fixtures view',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="max-w-5xl mx-auto px-4 py-6">
        <header className="mb-6 border-b">
          <nav className="flex gap-6 py-3 text-sm">
            <Link href="/" className="font-semibold">
              SureSlip
            </Link>
            <Link href="/today">Today</Link>
            <Link href="/next-48h">Next 48h</Link>
            <Link href="/competitions">Competitions</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
