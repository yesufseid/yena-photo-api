import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Yena Photo - Find Your Photos',
  description: 'Upload your selfie and find yourself in photo collections using AI-powered face recognition.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
