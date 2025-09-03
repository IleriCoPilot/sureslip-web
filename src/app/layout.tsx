import './globals.css';

export const metadata = { title: 'SureSlip' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900">
        <header className="border-b">
          <nav className="max-w-5xl m-auto flex gap-4 items-center h-12 px-4">
            <a className="font-semibold" href="/">SureSlip</a>
            <a href="/today" className="hover:underline">Today</a>
            <a href="/next-48h" className="hover:underline">Next 48h</a>
            <a href="/competitions" className="hover:underline">Competitions</a>
          </nav>
        </header>
        <main className="max-w-5xl m-auto p-4">{children}</main>
      </body>
    </html>
  );
}
