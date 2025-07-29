import { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || '防災持ち出し袋作成支援ツール',
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || '災害時の持ち出し袋作成を支援するWebアプリケーション',
  keywords: ['防災', '災害対策', '持ち出し袋', '避難', '緊急時対応'],
  authors: [{ name: 'Wakabo Team' }],
  robots: 'index, follow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          enableSystem={true}
          themes={['light', 'dark']}
          defaultTheme="system"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
