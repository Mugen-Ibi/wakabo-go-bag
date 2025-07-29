# Firebase最適化とパフォーマンス設定

## 1. Firestore インデックス設定

### 必要な複合インデックス

```json
// firebase.json に追加
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### firestore.indexes.json
```json
{
  "indexes": [
    {
      "collectionGroup": "trainingSessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "isSubmitted", "order": "ASCENDING" },
        { "fieldPath": "teamNumber", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "participants",
      "queryScope": "COLLECTION_GROUP", 
      "fields": [
        { "fieldPath": "isSubmitted", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## 2. Firebase Functions（オプション）

### 大量データ処理用のCloud Functions

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// セッション削除時のクリーンアップ
exports.cleanupSession = functions.firestore
  .document('artifacts/{appId}/public/data/trainingSessions/{sessionId}')
  .onDelete(async (snap, context) => {
    const { appId, sessionId } = context.params;
    
    const batch = db.batch();
    
    // サブコレクションのクリーンアップ
    const teamsRef = db.collection(`artifacts/${appId}/public/data/trainingSessions/${sessionId}/teams`);
    const participantsRef = db.collection(`artifacts/${appId}/public/data/trainingSessions/${sessionId}/participants`);
    
    const [teamsSnapshot, participantsSnapshot] = await Promise.all([
      teamsRef.get(),
      participantsRef.get()
    ]);
    
    teamsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    participantsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    return batch.commit();
  });

// セッション統計の集計
exports.updateSessionStats = functions.firestore
  .document('artifacts/{appId}/public/data/trainingSessions/{sessionId}/teams/{teamId}')
  .onWrite(async (change, context) => {
    const { appId, sessionId } = context.params;
    
    const teamsRef = db.collection(`artifacts/${appId}/public/data/trainingSessions/${sessionId}/teams`);
    const snapshot = await teamsRef.get();
    
    const totalTeams = snapshot.size;
    const submittedTeams = snapshot.docs.filter(doc => doc.data().isSubmitted).length;
    
    // 統計を更新
    const sessionRef = db.doc(`artifacts/${appId}/public/data/trainingSessions/${sessionId}`);
    return sessionRef.update({
      stats: {
        totalTeams,
        submittedTeams,
        completionRate: totalTeams > 0 ? submittedTeams / totalTeams : 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });
  });
```

## 3. セキュリティルールの詳細設定

```javascript
// より詳細なセキュリティルール
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // アプリケーション固有のデータ
    match /artifacts/{appId}/public/data/{document=**} {
      // 読み取りは認証されたユーザーのみ
      allow read: if request.auth != null;
      
      // セッション管理
      match /trainingSessions/{sessionId} {
        allow create: if request.auth != null 
          && isValidSessionData(request.resource.data);
        allow update: if request.auth != null 
          && onlyUpdatingAllowedFields(['isActive', 'accessCode']);
        allow delete: if request.auth != null;
      }
      
      // チームデータ
      match /trainingSessions/{sessionId}/teams/{teamId} {
        allow read, write: if request.auth != null;
        allow update: if request.auth != null 
          && onlyUpdatingAllowedFields(['selectedItems', 'isSubmitted', 'submittedAt']);
      }
      
      // 参加者データ
      match /trainingSessions/{sessionId}/participants/{participantId} {
        allow create, read, update: if request.auth != null;
        allow delete: if request.auth != null;
      }
      
      // アイテムリスト（読み取り専用）
      match /itemLists/{itemListId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null; // 管理者のみに制限する場合は条件を追加
      }
    }
  }
  
  // ヘルパー関数
  function isValidSessionData(data) {
    return data.keys().hasAll(['name', 'type', 'itemListId', 'accessCode']) &&
           data.type in ['lesson', 'workshop'] &&
           data.name is string &&
           data.itemListId is string &&
           data.accessCode is string;
  }
  
  function onlyUpdatingAllowedFields(allowedFields) {
    return request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(allowedFields);
  }
}
```

## 4. パフォーマンスモニタリング

### Firebase Performance Monitoring の設定

```javascript
// firebase-config.js に追加
import { getPerformance } from 'firebase/performance';

// Performance Monitoring を初期化
const perf = getPerformance(app);

// カスタムトレースの例
export const createCustomTrace = (traceName) => {
  const trace = perf.trace(traceName);
  trace.start();
  return trace;
};
```

## 5. データ容量の最適化

### データ構造の最適化

```javascript
// 効率的なデータ構造の例
const optimizedSessionData = {
  // 文字列フィールドは必要最小限に
  n: sessionName,           // name -> n
  t: sessionType,           // type -> t  
  il: itemListId,           // itemListId -> il
  ac: accessCode,           // accessCode -> ac
  a: isActive,              // isActive -> a
  c: serverTimestamp(),     // createdAt -> c
};

// ただし、可読性を重視する場合は完全な名前を使用することを推奨
```

## 6. バックアップとリストア

### 自動バックアップの設定

```bash
# Firebase CLI でバックアップを設定
firebase firestore:export gs://your-backup-bucket/backup-$(date +%Y%m%d)

# 定期バックアップ用のCloud Scheduler設定
gcloud scheduler jobs create http backup-firestore \
  --schedule="0 2 * * *" \
  --uri="https://us-central1-your-project.cloudfunctions.net/backupFirestore" \
  --http-method=GET
```
