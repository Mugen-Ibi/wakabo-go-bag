import { NextResponse } from 'next/server';

export async function GET() {
  // サーバーサイドでのみアクセス可能な環境変数を使用
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  };

  // 必要な設定がない場合はエラーを返す
  const missingConfig = Object.entries(config).filter(([_, value]) => !value);
  if (missingConfig.length > 0) {
    return NextResponse.json(
      { error: 'Missing Firebase configuration' },
      { status: 500 }
    );
  }

  return NextResponse.json(config);
}
