import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkyHostel',
  description:
    'Stay, explore, and make memories—The Ultimate Hostel Experience Awaits!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  );
}
