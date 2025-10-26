# 防災持ち出し袋作成支援ツール

災害時の持ち出し袋作成を支援するWebアプリケーションです。授業やワークショップでの利用を想定し、参加者が協力して防災アイテムを選択できます。

## 📋 目次

- [機能](#機能)
- [技術スタック](#技術スタック)
- [セットアップ](#セットアップ)
- [開発](#開発)
- [Firebase設定](#firebase設定)
- [デプロイ](#デプロイ)
- [セキュリティ](#セキュリティ)
- [トラブルシューティング](#トラブルシューティング)

## ✨ 機能

### 管理者モード
- **セッション管理**: 授業/ワークショップセッションの作成・管理
- **アイテムリスト管理**: 防災アイテムのリスト作成・編集
- **結果分析**: 参加者の選択結果の可視化・分析

### 参加者モード
- **セッション参加**: アクセスコードでセッションに参加
- **アイテム選択**: 最大10個までアイテムを選択
- **リアルタイム同期**: チーム内で選択状況を共有

### その他
- **ダークモード対応**: ライト/ダーク/システム設定の3種類
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応
- **アイコン対応**: Lucide Reactによる視覚的なアイテム表示

## 🛠 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript 5.8 |
| スタイリング | Tailwind CSS 4.1 |
| データベース | Firebase Firestore |
| 認証 | Firebase Authentication (匿名認証) |
| UI | Lucide React (アイコン) |
| グラフ | Recharts |
| 状態管理 | React Hooks |

## 🚀 セットアップ

### 1. 必須要件

- Node.js 18.x 以上
- npm / yarn / pnpm
- Firebaseアカウント

### 2. 依存関係のインストール

```bash
npm install
# または
yarn install
# または
pnpm install
```

### 3. 環境変数の設定

`.env.local` ファイルを作成し、Firebase設定を記入してください：

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

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いてアプリケーションを確認してください。

## 💻 開発

### コマンド一覧

```bash
# 開発サーバー起動
npm run dev

# Lintチェック
npm run lint

# プロダクションビルド
npm run build

# 本番環境起動
npm start
```

### プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── App.tsx            # メインアプリケーション
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # エントリーポイント
├── components/            # 再利用可能なコンポーネント
│   ├── AddItemModal.tsx   # アイテム追加モーダル
│   └── ui.tsx             # UIコンポーネント
├── lib/                   # ユーティリティ
│   ├── firebase.ts        # Firebase設定
│   ├── helpers.ts         # ヘルパー関数
│   ├── icons.ts           # アイコンマッピング
│   ├── itemUtils.ts       # アイテム処理
│   ├── time.ts            # 日付処理
│   └── utils.ts           # 汎用関数
├── modules/               # 機能モジュール
│   ├── admin/             # 管理者機能
│   └── participant/       # 参加者機能
└── types/                 # TypeScript型定義
    ├── env.d.ts
    └── index.ts
```

## 🔥 Firebase設定

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力
4. プロジェクトを作成

### 2. Webアプリの追加

1. プロジェクト概要で「ウェブ」アイコンをクリック
2. アプリのニックネームを入力
3. Firebase SDKの設定情報をコピーして `.env.local` に記入

### 3. Authentication の設定

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブで「匿名」を有効化

### 4. Firestore Database の設定

1. 左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. 本番モードで開始を選択
4. ロケーションを選択（`asia-northeast1` 推奨）

### 5. セキュリティルールの設定

`firestore.rules` ファイルの内容をFirebaseコンソールに適用：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Firestoreインデックスの作成

以下のインデックスを作成してください（自動的にプロンプトが表示される場合もあります）：

**trainingSessions コレクション:**
- フィールド: `createdAt` (降順)

**teams コレクショングループ:**
- フィールド: `teamNumber` (昇順)

## 🌐 デプロイ

### Vercelへのデプロイ（推奨）

1. GitHubリポジトリにプッシュ
2. [Vercel](https://vercel.com) でインポート
3. 環境変数を設定
4. デプロイ

### 環境変数の設定

Vercelの「Settings > Environment Variables」で以下を設定：

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

## 🔒 セキュリティ

### 環境変数について

- `NEXT_PUBLIC_` プレフィックス付きの環境変数は**クライアントサイドから参照可能**です
- Firebase Web SDKの性質上、これらの値はブラウザに公開されます
- APIキーが公開されても問題ありませんが、**Firestoreセキュリティルールを適切に設定**することが重要です

### セキュリティベストプラクティス

1. **認証を必須にする**: すべての操作で `request.auth != null` を確認
2. **データバリデーション**: 入力値の型と内容を検証
3. **最小権限の原則**: 必要最小限の権限のみを付与
4. **定期的な監視**: Firebase Consoleで異常なアクセスを監視

### 本番環境での注意事項

- `.env.local` は `.gitignore` に含まれており、コミットされません
- 機密性の高い情報（Admin SDK Key等）は `NEXT_PUBLIC_` を付けず、サーバーサイド専用として管理
- Firestoreルールを本番モードに設定

## 🐛 トラブルシューティング

### Firebase接続エラー

**症状**: "Firebase not initialized" エラー

**解決方法**:
1. `.env.local` ファイルが存在するか確認
2. すべての環境変数が正しく設定されているか確認
3. 開発サーバーを再起動

### ビルドエラー

**症状**: TypeScriptコンパイルエラー

**解決方法**:
```bash
# 型チェックを実行
npx tsc --noEmit

# node_modulesを再インストール
rm -rf node_modules package-lock.json
npm install
```

### データが表示されない

**症状**: セッションやアイテムリストが表示されない

**解決方法**:
1. Firebaseコンソールでデータが存在するか確認
2. セキュリティルールが正しく設定されているか確認
3. ブラウザのコンソールでエラーを確認

## 📚 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## � 詳細ドキュメント

より詳細な技術情報は [`docs/`](./docs) ディレクトリを参照してください:

- [Firebase設定ガイド](./docs/FIREBASE_GUIDE.md) - Firebase の詳細設定とベストプラクティス
- [開発ガイド](./docs/DEVELOPMENT.md) - 開発環境、アーキテクチャ、コーディング規約
- [リファクタリング履歴](./docs/REFACTORING_SUMMARY.md) - プロジェクト改善の履歴

## �📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

コントリビューションを歓迎します！プルリクエストやイシューをお気軽にお送りください。

---

**開発者向けメモ**: 詳細な技術情報は `docs/` ディレクトリを参照してください。
