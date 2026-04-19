import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OsonBooking Admin',
  description: 'OsonBooking boshqaruv paneli',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
