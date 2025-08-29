export type FirestoreTimestampLike = { seconds: number; nanoseconds: number };

// 値が Firestore Timestamp に似ているか
export function isFirestoreTimestamp(val: unknown): val is FirestoreTimestampLike {
  return (
    typeof val === 'object' &&
    val !== null &&
    'seconds' in (val as Record<string, unknown>) &&
    'nanoseconds' in (val as Record<string, unknown>)
  );
}

// Firestore Timestamp | Date | null/undefined をミリ秒に変換
export function toMillis(dt?: FirestoreTimestampLike | Date | null): number {
  if (!dt) return 0;
  if (dt instanceof Date) return dt.getTime();
  if (isFirestoreTimestamp(dt)) return dt.seconds * 1000 + Math.floor(dt.nanoseconds / 1e6);
  return 0;
}

// Firestore Timestamp | Date | null/undefined を Date に変換
export function toDate(dt?: FirestoreTimestampLike | Date | null): Date | null {
  if (!dt) return null;
  if (dt instanceof Date) return dt;
  if (isFirestoreTimestamp(dt)) return new Date(dt.seconds * 1000 + Math.floor(dt.nanoseconds / 1e6));
  return null;
}

// 日本語ロケールで日付文字列を出力（未定義時は '不明'）
export function formatJaDateFrom(dt?: FirestoreTimestampLike | Date | null, fallback = '不明'): string {
  const d = toDate(dt);
  return d ? d.toLocaleDateString('ja-JP') : fallback;
}
