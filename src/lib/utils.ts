import { ItemData } from '../types';

// ============================================================
// デバウンス・スロットル関数
// ============================================================

// デバウンス関数のユーティリティ
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      (func as (...args: Parameters<T>) => unknown)(...args);
    }, delay);
  };
}

// スロットル関数のユーティリティ
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime >= delay) {
      (func as (...args: Parameters<T>) => unknown)(...args);
      lastExecTime = currentTime;
    }
  };
}

// ============================================================
// クリップボード操作
// ============================================================

export const copyToClipboard = (
  text: string, 
  setNotification: (n: { type: 'success' | 'error'; message: string }) => void
) => {
  navigator.clipboard.writeText(text).then(() => {
    setNotification({ type: 'success', message: `${text} をコピーしました。` });
  }).catch(() => {
    setNotification({ type: 'error', message: 'コピーに失敗しました。' });
  });
};

// ============================================================
// アイテムデータ操作
// ============================================================

// アイテムデータの正規化（文字列とオブジェクトの両方をサポート）
export const normalizeItem = (item: string | ItemData): ItemData => {
  if (typeof item === 'string') {
    return { name: item };
  }
  return item;
};

// アイテム名を取得
export const getItemName = (item: string | ItemData): string => {
  return typeof item === 'string' ? item : item.name;
};

// アイテムがオブジェクト形式かチェック
export const isItemData = (item: string | ItemData): item is ItemData => {
  return typeof item === 'object' && item !== null && 'name' in item;
};

// 後方互換性のためのデータ変換
export const migrateItemList = (items: (string | ItemData)[]): ItemData[] => {
  return items.map(normalizeItem);
};

// ============================================================
// 定数
// ============================================================

export const MAX_SELECTION = 10;
export const INITIAL_DEFAULT_ITEMS = [
  '水（500ml x 4本程度）', '食料（3日分）', '非常食（乾パン、缶詰など）', '医薬品・救急セット', '現金（小銭も）', '身分証明書のコピー', '懐中電灯（予備電池も）', '携帯ラジオ', 'スマートフォン・携帯電話', 'モバイルバッテリー', 'ヘルメット・防災頭巾', 'マスク', '軍手', 'ロープ', '笛・ホイッスル', '筆記用具・メモ帳', '常備薬・お薬手帳', '生理用品', '乳幼児用品（ミルク、おむつ）', '介護用品', 'めがね・コンタクトレンズ', '衣類（下着、靴下など）', 'タオル', 'レインコート・雨具', 'ブランケット・寝袋', '携帯トイレ', 'トイレットペーパー', 'ティッシュペーパー', 'ウェットティッシュ', 'ゴミ袋（大小）', 'サランラップ', 'マッチ・ライター', '缶切り・ナイフ', '家族の写真', '地域のハザードマップ', '使い捨てカイロ', '歯ブラシ・衛生用品', '安眠グッズ（アイマスク、耳栓）', '布製ガムテープ', '予備の鍵'
];
