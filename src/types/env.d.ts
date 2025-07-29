// 環境変数の型定義
declare namespace NodeJS {
  interface ProcessEnv {
    // Firebase設定
    NEXT_PUBLIC_FIREBASE_API_KEY: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
    NEXT_PUBLIC_FIREBASE_APP_ID: string;
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?: string;
    
    // アプリケーション設定
    NEXT_PUBLIC_APP_NAME?: string;
    NEXT_PUBLIC_APP_DESCRIPTION?: string;
  }
}
