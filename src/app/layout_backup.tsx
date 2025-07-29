import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "防災持ち出し袋作成支援ツール",
  description: "災害時に必要な持ち出し袋の内容を効率的に選択できる支援ツール",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}
