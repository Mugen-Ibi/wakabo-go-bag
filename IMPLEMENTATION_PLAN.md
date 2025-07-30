# アイテム画像・アイコン機能実装計画

## 1. データ構造の変更

### 現在の ItemList 構造
```typescript
export interface ItemList {
  id: string;
  name: string;
  items: string[];  // 文字列の配列
  isDefault?: boolean;
}
```

### 新しい ItemList 構造
```typescript
export interface ItemData {
  name: string;
  icon?: string;           // アイコン名（Lucide React）
  image?: string;          // 画像URL
  category?: string;       // カテゴリ（食料、医療用品など）
  description?: string;    // 説明文
}

export interface ItemList {
  id: string;
  name: string;
  items: ItemData[];       // オブジェクトの配列に変更
  isDefault?: boolean;
}
```

## 2. コンポーネントの変更

### Item コンポーネントの拡張
- 画像・アイコン表示機能
- レイアウトの調整（縦配置）
- 詳細情報のツールチップ

### ItemListManager の拡張
- アイテム追加時の画像・アイコン選択UI
- プレビュー機能
- カテゴリ管理

## 3. 画像管理方式の選択肢

### A. Firebase Storage + URL方式（推奨）
- メリット: 本格的、スケーラブル、管理しやすい
- デメリット: 実装コストが高い

### B. Lucide React アイコン方式（簡単）
- メリット: 実装が簡単、一貫したデザイン
- デメリット: アイコンの種類に限界

### C. 事前定義画像方式（中間）
- メリット: 実装が比較的簡単
- デメリット: 画像の追加が開発者依存

## 4. 実装の段階

### フェーズ1: アイコン対応（最小実装）
1. データ構造拡張
2. Itemコンポーネント更新
3. ItemListManager更新
4. 既存データのマイグレーション

### フェーズ2: 画像対応
1. Firebase Storage設定
2. 画像アップロード機能
3. 画像管理UI

### フェーズ3: 高度な機能
1. カテゴリ分類
2. 検索・フィルタ機能
3. テンプレート機能
