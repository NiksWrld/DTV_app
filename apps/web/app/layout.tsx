import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'DTV Workspace',
  description:
    'Prepare, organize, and review your Destination Thailand Visa application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-dvh flex flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
