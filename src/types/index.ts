// 共通の型定義
export type NotificationType = { type: 'success' | 'error'; message: string } | null;

export type SessionType = 'lesson' | 'workshop';

export interface ItemList {
  id: string;
  name: string;
  items: string[];
  isDefault?: boolean;
}

export interface Session {
  id: string;
  name: string;
  type: SessionType;
  itemListId: string;
  accessCode: string;
  isActive: boolean;
  createdAt: any;
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
