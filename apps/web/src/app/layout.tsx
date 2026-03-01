import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Motivational Shorts',
  description: 'Production-safe MVP shell for creating motivational short videos.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
