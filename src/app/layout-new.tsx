import { ReactNode } from 'react'

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <head>
        <title>Wakabo Go Bag</title>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
