import type { Metadata } from 'next';
import { Syne, Barlow_Condensed, Playfair_Display, JetBrains_Mono, DM_Sans, Space_Mono } from 'next/font/google';
import './globals.css';

const syne = Syne({ subsets: ['latin'], weight: ['400', '700', '800'], variable: '--font-display' });
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['400', '700', '800'], variable: '--font-condensed' });
const playfairDisplay = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], variable: '--font-serif' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body' });
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-space-mono' });

export const metadata: Metadata = {
  title: 'Outsurance',
  description: 'Editorial health insurance frontend built around zero-knowledge assessment flows.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${barlowCondensed.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} ${dmSans.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

