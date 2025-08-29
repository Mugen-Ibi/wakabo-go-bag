// 共通の型定義
export type NotificationType = { type: 'success' | 'error'; message: string } | null;

export type SessionType = 'lesson' | 'workshop';

// アイテムデータの新しい構造
export interface ItemData {
  name: string;
  icon?: string;           // Lucide React アイコン名
  category?: string;       // カテゴリ（食料、医療用品など）
  description?: string;    // 説明文
}

export interface ItemList {
  id: string;
  name: string;
  items: (string | ItemData)[];  // 後方互換性のため両方サポート
  isDefault?: boolean;
}

export interface Session {
  id: string;
  name: string;
  type: SessionType;
  itemListId: string;
  accessCode: string;
  isActive: boolean;
  createdAt: { seconds: number; nanoseconds: number } | Date | null;
}

export interface SessionInfo {
  type: SessionType;
  sessionId: string;
  teamNumber?: number;
  itemList: ItemList;
  sessionName: string;
}

export interface TeamResult {
  id: string;
  teamNumber: number;
  isSubmitted: boolean;
  selectedItems?: string[];
}

export interface SessionStats {
  submittedCount: number;
  totalCount: number;
}

export interface AccessCode {
  id: string;
  code: string;
  type: 'team' | 'common';
  number?: number;
}
