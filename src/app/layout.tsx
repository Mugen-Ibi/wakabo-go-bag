import { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || '防災持ち出し袋作成支援ツール',
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || '災害時の持ち出し袋作成を支援するWebアプリケーション',
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
