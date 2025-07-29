# 防災持ち出し袋作成支援ツール

災害時の持ち出し袋作成を支援するWebアプリケーションです。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. 環境変数の設定

`.env.example`ファイルをコピーして`.env`ファイルを作成してください：

```bash
cp .env.example .env
```

`.env`ファイルでFirebaseの設定値を設定してください：

```env
# Firebase設定
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# アプリケーション設定
NEXT_PUBLIC_APP_NAME=防災持ち出し袋作成支援ツール
NEXT_PUBLIC_APP_DESCRIPTION=災害時の持ち出し袋作成を支援するWebアプリケーション
```

### 3. 開発サーバーの起動

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いてアプリケーションを確認してください。

## 機能

- **管理者モード**: セッション管理、アイテムリスト管理、結果分析
- **参加者モード**: セッション参加、アイテム選択
- **テーマ対応**: ライト・ダークモードの自動切り替え
- **レスポンシブデザイン**: モバイル・デスクトップ対応

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication
- **アイコン**: Lucide React

## セキュリティ

### 環境変数について
- `NEXT_PUBLIC_`プレフィックス付きの環境変数は**ブラウザからもアクセス可能**です
- Firebase Web SDKの性質上、APIキーなどの設定値はクライアントサイドで利用されます
- これらの値は公開されても問題ありませんが、Firebaseコンソールでセキュリティルールを適切に設定してください

### Firebaseセキュリティルールの設定推奨事項
```javascript
// Firestore Rules例
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 認証されたユーザーのみアクセス可能
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 本番環境での注意事項
- `.env`ファイルは`.gitignore`に含まれており、コミットされません
- 本番環境では環境変数を適切に設定してください
- より機密性の高い情報（Admin SDK Key等）は`NEXT_PUBLIC_`プレフィックスを**使用せず**、サーバーサイドでのみ使用してください

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
