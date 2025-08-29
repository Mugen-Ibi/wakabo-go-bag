// Firebase設定とヘルパー関数 - プロダクション版
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

// Firebaseの設定
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyD9yEQy_7iKfnLLqwfglkaVLcKceMS3MsA',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'emergency-go-bag.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'emergency-go-bag',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'emergency-go-bag.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '7832059811',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:7832059811:web:9d436c185a47937d0fe416',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-JNVXK8LXVH'
};

// Firebase初期化のヘルパー関数
function initFirebase() {
  return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

// Firebase servicesの取得
function getDbInstance(): Firestore {
  return getFirestore(initFirebase());
}

function getAuthInstance(): Auth {
  return getAuth(initFirebase());
}

function getFunctionsInstance(): Functions {
  return getFunctions(initFirebase());
}

// エクスポート
export const db = getDbInstance();
export const auth = getAuthInstance();
export const functions = getFunctionsInstance();

// appIdを動的に設定できるように
export const appId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'emergency-go-bag';

// ネットワーク状態管理のヘルパー
export const firebaseNetworkHelpers = {
  // ネットワークを有効化
  enableNetwork: async () => {
    if (!db) return;
    try {
      await enableNetwork(db);
      console.log('Firebase network enabled');
    } catch (error) {
      console.warn('Failed to enable Firebase network:', error);
    }
  },
  
  // ネットワークを無効化（オフラインモード）
  disableNetwork: async () => {
    if (!db) return;
    try {
      await disableNetwork(db);
      console.log('Firebase network disabled (offline mode)');
    } catch (error) {
      console.warn('Failed to disable Firebase network:', error);
    }
  },
  
  // 接続状態をチェック
  checkConnection: () => {
    if (!db) return Promise.resolve(false);
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, 5000); // 5秒でタイムアウト
      
      // 簡単な接続テスト
      import('firebase/firestore').then(({ doc, getDoc }) => {
        getDoc(doc(db!, 'test', 'connection'))
          .then(() => {
            clearTimeout(timeoutId);
            resolve(true);
          })
          .catch(() => {
            clearTimeout(timeoutId);
            resolve(false);
          });
      });
    });
  }
};

// Firestoreパスヘルパー関数
export const firestorePaths = {
  // セッション関連
  sessions: () => `artifacts/${appId}/public/data/trainingSessions`,
  session: (sessionId: string) => `artifacts/${appId}/public/data/trainingSessions/${sessionId}`,
  
  // チーム関連
  teams: (sessionId: string) => `artifacts/${appId}/public/data/trainingSessions/${sessionId}/teams`,
  team: (sessionId: string, teamId: string) => `artifacts/${appId}/public/data/trainingSessions/${sessionId}/teams/${teamId}`,
  
  // 参加者関連
  participants: (sessionId: string) => `artifacts/${appId}/public/data/trainingSessions/${sessionId}/participants`,
  participant: (sessionId: string, participantId: string) => `artifacts/${appId}/public/data/trainingSessions/${sessionId}/participants/${participantId}`,
  
  // アイテムリスト関連
  itemLists: () => `artifacts/${appId}/public/data/itemLists`,
  itemList: (itemListId: string) => `artifacts/${appId}/public/data/itemLists/${itemListId}`,
};

// よく使用されるFirestore操作のヘルパー関数
export const firestoreHelpers = {
  // セッション作成時のバッチ処理
  createSessionWithTeams: async (sessionData: any, teamCount: number) => {
    const { writeBatch, collection, doc, serverTimestamp } = await import('firebase/firestore');
    
    const batch = writeBatch(db);
    
    // セッション作成
    const sessionRef = doc(collection(db, firestorePaths.sessions()));
    batch.set(sessionRef, {
      ...sessionData,
      createdAt: serverTimestamp(),
    });
    
    // チーム作成
    if (sessionData.type === 'lesson') {
      for (let i = 1; i <= teamCount; i++) {
        const teamRef = doc(collection(db, firestorePaths.teams(sessionRef.id)));
        batch.set(teamRef, {
          teamNumber: i,
          accessCode: Math.floor(1000 + Math.random() * 9000).toString(),
          selectedItems: [],
          isSubmitted: false,
          createdAt: serverTimestamp(),
        });
      }
    }
    
    await batch.commit();
    return sessionRef;
  },
  
  // セッション削除時のバッチ処理
  deleteSessionWithSubcollections: async (sessionId: string) => {
    const { writeBatch, collection, getDocs, doc } = await import('firebase/firestore');
    
    const batch = writeBatch(db);
    
    // チームデータを削除
    const teamsSnapshot = await getDocs(collection(db, firestorePaths.teams(sessionId)));
    teamsSnapshot.docs.forEach((teamDoc) => {
      batch.delete(teamDoc.ref);
    });
    
    // 参加者データを削除
    const participantsSnapshot = await getDocs(collection(db, firestorePaths.participants(sessionId)));
    participantsSnapshot.docs.forEach((participantDoc) => {
      batch.delete(participantDoc.ref);
    });
    
    // セッション本体を削除
    const sessionRef = doc(db, firestorePaths.session(sessionId));
    batch.delete(sessionRef);
    
    await batch.commit();
  },
};
