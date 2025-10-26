# 開発ガイド

このドキュメントでは、プロジェクトの開発に関する詳細情報を提供します。

## 📋 目次

- [開発環境のセットアップ](#開発環境のセットアップ)
- [アーキテクチャ](#アーキテクチャ)
- [コーディング規約](#コーディング規約)
- [テスト](#テスト)
- [デバッグ](#デバッグ)
- [リファクタリング履歴](#リファクタリング履歴)

## 🛠 開発環境のセットアップ

### 必須ツール

- Node.js 18.x 以上
- npm / yarn / pnpm
- Git
- VS Code（推奨）

### VS Code拡張機能（推奨）

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag"
  ]
}
```

### 環境変数の管理

開発環境では `.env.local` を使用:

```bash
# .env.local を作成
cp .env.example .env.local

# 環境変数を編集
code .env.local
```

## 🏗 アーキテクチャ

### ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── App.tsx            # ルートコンポーネント
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # エントリーポイント
│   └── api/               # APIルート（将来の拡張用）
│
├── components/            # 再利用可能なUIコンポーネント
│   ├── ui.tsx             # 基本UIコンポーネント
│   │   ├── Card          # カードコンテナ
│   │   ├── Button        # ボタン
│   │   ├── IconButton    # アイコンボタン
│   │   ├── Item          # アイテム表示
│   │   ├── Modal         # モーダルダイアログ
│   │   └── Notification  # 通知トースト
│   └── AddItemModal.tsx   # アイテム追加専用モーダル
│
├── lib/                   # ユーティリティとヘルパー
│   ├── firebase.ts        # Firebase設定とヘルパー
│   ├── helpers.ts         # 汎用ヘルパー関数
│   ├── icons.ts           # アイコンマッピング
│   ├── itemUtils.ts       # アイテムデータ処理
│   ├── time.ts            # 日付・時刻処理
│   └── utils.ts           # デバウンス等のユーティリティ
│
├── modules/               # 機能モジュール
│   ├── admin/             # 管理者機能
│   │   ├── AdminHub.tsx           # 管理ハブ
│   │   ├── SessionManager.tsx     # セッション管理
│   │   ├── ItemListManager.tsx    # アイテムリスト管理
│   │   └── ResultsDashboard.tsx   # 結果分析
│   └── participant/       # 参加者機能
│       ├── JoinSession.tsx        # セッション参加
│       └── ParticipantMode.tsx    # 参加者画面
│
└── types/                 # TypeScript型定義
    ├── index.ts           # 共通型定義
    └── env.d.ts           # 環境変数の型定義
```

### データフロー

```
User Action
    ↓
Component (React)
    ↓
Firebase SDK
    ↓
Firestore / Auth
    ↓
onSnapshot (リアルタイム購読)
    ↓
State Update
    ↓
Re-render
```

### 状態管理

- **ローカル状態**: `useState` / `useReducer`
- **グローバル状態**: なし（将来的にZustand等を検討）
- **サーバー状態**: Firebase Firestore の `onSnapshot`

## 📝 コーディング規約

### TypeScript

#### 型定義

```typescript
// ✅ 良い例: 明示的な型定義
interface Session {
  id: string;
  name: string;
  type: 'lesson' | 'workshop';
  itemListId: string;
  accessCode?: string;
  isActive: boolean;
  createdAt: FirestoreTimestamp | Date | null;
}

// ❌ 悪い例: any 型の使用
const data: any = getData();
```

#### Null安全性

```typescript
// ✅ 良い例: オプショナルチェーン
const code = session.accessCode ?? 'デフォルト値';

// ❌ 悪い例: 強制的な非null断言
const code = session.accessCode!;
```

### React

#### コンポーネント定義

```typescript
// ✅ 良い例: Propsの型定義
interface ButtonProps {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  disabled = false,
  className = '' 
}) => {
  // ...
};
```

#### Hooks の使用

```typescript
// ✅ 良い例: 依存配列の明示
useEffect(() => {
  const unsubscribe = onSnapshot(query, (snapshot) => {
    // ...
  });
  return () => unsubscribe();
}, [query]); // 依存配列を明示

// ❌ 悪い例: 依存配列の省略
useEffect(() => {
  // ...
}); // 依存配列なし
```

### CSS / Tailwind

#### クラス名の順序

1. レイアウト（flex, grid, position）
2. サイズ（w-, h-, p-, m-）
3. 色（bg-, text-, border-）
4. その他（rounded, shadow, transition）

```tsx
// ✅ 良い例
<div className="flex items-center justify-between p-4 bg-white text-gray-900 rounded-lg shadow-md">

// ❌ 悪い例
<div className="shadow-md text-gray-900 bg-white rounded-lg flex p-4 justify-between items-center">
```

#### テーマクラスの使用

```tsx
// ✅ 良い例: テーマクラスを使用
<div className="theme-bg-primary theme-text-primary">

// ❌ 悪い例: 直接色を指定
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
```

### ファイル命名規則

- **コンポーネント**: PascalCase（例: `AdminHub.tsx`）
- **ユーティリティ**: camelCase（例: `firebase.ts`）
- **型定義**: camelCase（例: `index.ts`）
- **CSS**: kebab-case（例: `globals.css`）

## 🧪 テスト

### 現状

現在、自動テストは実装されていません。

### 推奨テスト戦略

#### ユニットテスト

```typescript
// lib/__tests__/utils.test.ts
import { normalizeItem, getItemName } from '../utils';

describe('utils', () => {
  describe('normalizeItem', () => {
    it('文字列を ItemData に変換', () => {
      const result = normalizeItem('水');
      expect(result).toEqual({ name: '水' });
    });

    it('ItemData をそのまま返す', () => {
      const item = { name: '水', icon: 'droplet' };
      const result = normalizeItem(item);
      expect(result).toBe(item);
    });
  });
});
```

#### コンポーネントテスト

```typescript
// components/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react';
import { Button } from '../ui';

describe('Button', () => {
  it('クリックイベントが発火する', () => {
    const handleClick = jest.fn();
    const { getByText } = render(
      <Button onClick={handleClick}>クリック</Button>
    );
    
    fireEvent.click(getByText('クリック'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### テストの実行（将来）

```bash
# ユニットテスト
npm run test

# カバレッジ
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

## 🐛 デバッグ

### Firestoreデバッグ

```typescript
// Firestore操作のログ出力
import { setLogLevel } from 'firebase/firestore';

if (process.env.NODE_ENV === 'development') {
  setLogLevel('debug');
}
```

### Reactコンポーネントデバッグ

```typescript
// useEffect のデバッグ
useEffect(() => {
  console.log('Component mounted');
  console.log('State:', { value1, value2 });
  
  return () => {
    console.log('Component unmounted');
  };
}, [value1, value2]);
```

### ネットワークデバッグ

Chromeデベロッパーツール:
1. F12 でデベロッパーツールを開く
2. 「Network」タブを選択
3. Firebase API リクエストを確認

### パフォーマンスデバッグ

React DevTools Profiler:
1. React DevTools をインストール
2. 「Profiler」タブで記録開始
3. 操作を実行
4. レンダリング時間を分析

## 📚 リファクタリング履歴

### 2025年10月26日 - 大規模リファクタリング

詳細は `REFACTORING_SUMMARY.md` を参照。

**主な変更点**:
- 型安全性の向上（TypeScriptエラー0件達成）
- CSS Modulesの廃止、globals.cssへの統合
- アクセシビリティの改善
- 型定義の強化と統一

**影響範囲**:
- `src/types/index.ts` - 型定義の追加
- `src/components/ui.tsx` - アクセシビリティ改善
- `src/app/globals.css` - スタイル統合
- `src/modules/**/*.tsx` - 型の統一

## 🔄 CI/CD

### GitHub Actions（推奨設定）

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
```

## 🚀 デプロイメント

### 環境別設定

| 環境 | ブランチ | デプロイ先 | 自動デプロイ |
|------|---------|-----------|------------|
| 開発 | develop | Vercel Preview | ✅ |
| 本番 | main | Vercel Production | ✅ |

### デプロイ前チェックリスト

- [ ] Lintエラーなし
- [ ] ビルド成功
- [ ] 環境変数の設定
- [ ] Firebaseルールの確認
- [ ] パフォーマンステスト

## 📖 参考資料

### 公式ドキュメント

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)

### コミュニティ

- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [React Discord](https://discord.gg/react)

---

**貢献**: このドキュメントへの改善提案を歓迎します！
