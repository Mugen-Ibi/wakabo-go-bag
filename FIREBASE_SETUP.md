# Firebase設定手順

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: emergency-go-bag）
4. Google Analyticsは任意で設定
5. プロジェクトを作成

## 2. Webアプリの追加

1. プロジェクト概要で「ウェブ」アイコンをクリック
2. アプリのニックネームを入力
3. Firebase SDKの設定情報をコピー（.envファイルで使用）

## 3. Authentication の設定

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブで「匿名」を有効化
   - 匿名認証を有効にする
   - 保存をクリック

## 4. Firestore Database の設定

1. 左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. セキュリティルールで「テストモードで開始」を選択
4. ロケーションを選択（asia-northeast1 推奨）
5. 完了をクリック

## 5. セキュリティルールの設定

1. Firestore Database > ルール タブを選択
2. 上記の firestore.rules の内容を貼り付け
3. 「公開」をクリック

## 6. 初期データの作成

### アイテムリストの初期データ
コレクション: `artifacts/emergency-go-bag/public/data/itemLists`

```json
// 基本セット
{
  "id": "basic-set",
  "name": "基本セット",
  "isDefault": true,
  "items": [
    "懐中電灯",
    "電池",
    "携帯ラジオ",
    "非常食（3日分）",
    "飲料水（3日分）",
    "救急用品",
    "薬（常備薬）",
    "現金",
    "身分証明書",
    "保険証",
    "携帯電話充電器",
    "タオル",
    "着替え",
    "毛布",
    "軍手",
    "マスク",
    "除菌用アルコール",
    "ティッシュ",
    "ウェットティッシュ",
    "ビニール袋"
  ]
}
```

## 7. インデックスの作成

必要に応じて複合インデックスを作成：

1. Firestore Database > インデックス タブ
2. 「複合インデックスを追加」をクリック
3. 以下のインデックスを作成：

### trainingSessions インデックス
- コレクション: `trainingSessions`
- フィールド: `createdAt` (降順)
- クエリスコープ: コレクション

### teams インデックス  
- コレクション: `teams`
- フィールド: `teamNumber` (昇順), `createdAt` (昇順)
- クエリスコープ: コレクショングループ

## 8. パフォーマンス最適化

### バッチ書き込みの使用
大量のチーム作成時はバッチ処理を使用：

```javascript
import { writeBatch } from 'firebase/firestore';

const batch = writeBatch(db);
for (let i = 1; i <= teamCount; i++) {
  const teamRef = doc(collection(db, `trainingSessions/${sessionId}/teams`));
  batch.set(teamRef, {
    teamNumber: i,
    accessCode: generateAccessCode(),
    selectedItems: [],
    isSubmitted: false,
    createdAt: serverTimestamp()
  });
}
await batch.commit();
```

## 9. 監視とログ

1. Firebase Console > プロジェクト設定 > 統合
2. Google Cloudコンソールでログ監視を設定
3. 使用量とパフォーマンスを定期的にチェック
