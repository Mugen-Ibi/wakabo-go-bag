# Firebase設定ガイド

このドキュメントでは、Firebase設定の詳細手順とベストプラクティスを説明します。

## 📋 目次

- [初期設定](#初期設定)
- [セキュリティルール](#セキュリティルール)
- [パフォーマンス最適化](#パフォーマンス最適化)
- [バックアップ](#バックアップ)
- [監視とログ](#監視とログ)

## 🚀 初期設定

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `emergency-go-bag`）
4. Google Analyticsは任意で設定
5. プロジェクトを作成

### 2. Webアプリの登録

1. プロジェクト概要で「ウェブ」アイコン（`</>`）をクリック
2. アプリのニックネームを入力
3. Firebase Hosting は任意で設定
4. 「アプリを登録」をクリック
5. 表示された設定情報を `.env.local` にコピー

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123
```

### 3. Authentication の設定

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブを選択
4. 「匿名」プロバイダを有効化
5. 「保存」をクリック

**なぜ匿名認証？**
- ユーザー登録なしで利用可能
- セッションごとに一意のユーザーIDを自動生成
- セキュリティルールで認証状態を確認できる

### 4. Firestore Database の設定

1. 左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. **本番モードで開始**を選択（推奨）
4. ロケーションを選択:
   - 推奨: `asia-northeast1` (東京)
   - 代替: `asia-northeast2` (大阪)
5. 「有効にする」をクリック

### 5. 初期データ構造の作成

Firestoreコンソールで以下のコレクション構造を作成してください:

```
artifacts/
  └── {PROJECT_ID}/
      └── public/
          └── data/
              ├── itemLists/
              │   └── {itemListId}
              │       ├── name: string
              │       ├── items: array
              │       ├── isDefault: boolean
              │       └── createdAt: timestamp
              └── trainingSessions/
                  └── {sessionId}
                      ├── name: string
                      ├── type: string ('lesson' | 'workshop')
                      ├── itemListId: string
                      ├── accessCode: string
                      ├── isActive: boolean
                      └── createdAt: timestamp
```

### 6. 基本アイテムリストの作成（任意）

アプリケーション初回起動時に自動的に作成されますが、手動で作成する場合:

1. Firestoreコンソールで `artifacts/{PROJECT_ID}/public/data/itemLists` に移動
2. 「ドキュメントを追加」をクリック
3. 以下のフィールドを設定:

```
ドキュメントID: (自動ID)
フィールド:
  name: "基本セット"
  isDefault: true
  items: [
    "水（500ml x 4本程度）",
    "食料（3日分）",
    "非常食（乾パン、缶詰など）",
    "医薬品・救急セット",
    "現金（小銭も）",
    "身分証明書のコピー",
    "懐中電灯（予備電池も）",
    "携帯ラジオ",
    "スマートフォン・携帯電話",
    "モバイルバッテリー"
  ]
  createdAt: (サーバータイムスタンプ)
```

## 🔒 セキュリティルール

### 基本ルール

プロジェクトルートの `firestore.rules` ファイル:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // アプリケーションデータへのアクセス
    match /artifacts/{appId}/public/data/{document=**} {
      // すべての操作で認証を必須にする
      allow read, write: if request.auth != null;
    }
  }
}
```

### 詳細なセキュリティルール（推奨）

より厳密なルールで、各コレクションごとに権限を設定:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data {
      // アイテムリスト: 読み取りは全員、書き込みは認証済みユーザー
      match /itemLists/{itemListId} {
        allow read: if request.auth != null;
        allow create, update, delete: if request.auth != null;
      }
      
      // トレーニングセッション
      match /trainingSessions/{sessionId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null 
          && isValidSessionData(request.resource.data);
        allow update: if request.auth != null 
          && onlyUpdatingFields(['isActive', 'accessCode']);
        allow delete: if request.auth != null;
        
        // チームデータ
        match /teams/{teamId} {
          allow read, write: if request.auth != null;
        }
        
        // 参加者データ
        match /participants/{participantId} {
          allow read, write: if request.auth != null;
        }
      }
    }
  }
  
  // ヘルパー関数
  function isValidSessionData(data) {
    return data.keys().hasAll(['name', 'type', 'itemListId', 'createdAt']) &&
           data.type in ['lesson', 'workshop'] &&
           data.name is string &&
           data.itemListId is string;
  }
  
  function onlyUpdatingFields(allowedFields) {
    return request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(allowedFields);
  }
}
```

### ルールのテスト

Firebaseコンソールの「ルール」タブで「シミュレーター」を使用してテスト:

```
場所: /artifacts/your-project/public/data/itemLists/test
タイプ: get
認証: カスタムトークン（auth.uid = 'test-user'）

期待結果: 許可
```

## ⚡ パフォーマンス最適化

### インデックスの作成

効率的なクエリのために複合インデックスを作成:

**自動作成**
- アプリケーション使用中にエラーが発生した場合、Firebaseが自動的にインデックス作成リンクを提供

**手動作成**
1. Firestoreコンソール > 「インデックス」タブ
2. 「複合クエリ」セクションで「インデックスを追加」

必要なインデックス:

| コレクション | フィールド1 | フィールド2 | スコープ |
|-------------|-----------|-----------|---------|
| trainingSessions | createdAt (降順) | - | コレクション |
| teams | teamNumber (昇順) | createdAt (昇順) | コレクショングループ |

### バッチ処理の実装

複数のチーム作成時はバッチ処理を使用（既に実装済み）:

```typescript
// firestoreHelpers.createSessionWithTeams() を参照
// src/lib/firebase.ts
```

### データサイズの最適化

- 不要なフィールドを削除
- 配列のサイズを制限（アイテム選択は最大10個）
- タイムスタンプは `serverTimestamp()` を使用

## 💾 バックアップ

### 手動バックアップ

Firebase CLIを使用してバックアップ:

```bash
# Firebase CLIをインストール
npm install -g firebase-tools

# ログイン
firebase login

# エクスポート
firebase firestore:export gs://your-backup-bucket/backup-$(date +%Y%m%d)
```

### 自動バックアップ（Cloud Functions）

定期的なバックアップを設定する場合:

```javascript
// functions/src/backup.ts
import * as functions from 'firebase-functions';
import * as firestore from '@google-cloud/firestore';

export const scheduledFirestoreExport = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    const databaseName = 'default';
    
    const client = new firestore.v1.FirestoreAdminClient();
    const databasePath = client.databasePath(projectId!, databaseName);
    
    const bucket = `gs://${projectId}-backups`;
    
    await client.exportDocuments({
      name: databasePath,
      outputUriPrefix: bucket,
      collectionIds: []
    });
    
    console.log('Backup completed');
  });
```

## 📊 監視とログ

### Firebase Performance Monitoring

パフォーマンスの追跡（オプション）:

```typescript
// src/lib/firebase.ts に追加
import { getPerformance } from 'firebase/performance';

export const perf = getPerformance(app);

// カスタムトレースの例
export const measureSessionCreation = () => {
  const trace = perf.trace('create_session');
  trace.start();
  
  // ... セッション作成処理 ...
  
  trace.stop();
};
```

### ログの確認

1. Firebase Console > 「使用量と請求額」
2. 「割り当て」タブでリソース使用状況を確認
3. Google Cloud Console でより詳細なログを確認可能

### アラートの設定

1. Firebase Console > 「アラート」
2. 使用量が閾値を超えた場合の通知を設定
3. 推奨アラート:
   - 1日の読み取り回数が10万回を超えた場合
   - 1日の書き込み回数が5万回を超えた場合

## 🔍 トラブルシューティング

### 権限エラー

**エラー**: "Missing or insufficient permissions"

**解決方法**:
1. Firestoreルールを確認
2. ユーザーが正しく認証されているか確認
3. パスが正しいか確認

### インデックスエラー

**エラー**: "The query requires an index"

**解決方法**:
1. エラーメッセージのリンクをクリック
2. 自動的にインデックスが作成される
3. 数分待ってから再試行

### 接続エラー

**エラー**: "Failed to get document because the client is offline"

**解決方法**:
1. ネットワーク接続を確認
2. Firebaseサービスのステータスを確認
3. オフライン永続化を有効化（オプション）

## 📚 参考リンク

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

**メンテナンス**: このドキュメントはFirebaseの仕様変更に応じて更新してください。
