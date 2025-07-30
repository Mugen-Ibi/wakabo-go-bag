import { ItemData } from '../types';

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
