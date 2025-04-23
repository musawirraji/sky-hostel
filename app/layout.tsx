import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';

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
      <head>
        <Script
          src='https://remitademo.net/payment/v1/remita-pay-inline.bundle.js'
          strategy='afterInteractive'
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
