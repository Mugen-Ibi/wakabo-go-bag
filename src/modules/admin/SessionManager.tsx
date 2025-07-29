import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, appId, firebaseNetworkHelpers } from '../../lib/firebase';
import { Card, Button, IconButton } from '../../components/ui';
import { Plus, Play, Users, Trash2, Copy, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import type { Session, ItemList, NotificationType } from '../../types';

interface SessionManagerProps {
  itemLists: ItemList[];
  onViewResults: (session: Session) => void;
  setNotification: (n: NotificationType) => void;
}

// 状態管理をuseReducerで統一
interface SessionState {
  sessions: Session[];
  newSessionName: string;
  newSessionType: 'lesson' | 'workshop';
  selectedItemListId: string;
  teamCount: number;
  isSubmitting: boolean;
}

type SessionAction = 
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'SET_NEW_SESSION_NAME'; payload: string }
  | { type: 'SET_NEW_SESSION_TYPE'; payload: 'lesson' | 'workshop' }
  | { type: 'SET_SELECTED_ITEM_LIST_ID'; payload: string }
  | { type: 'SET_TEAM_COUNT'; payload: number }
  | { type: 'SET_IS_SUBMITTING'; payload: boolean }
  | { type: 'RESET_FORM' };

const initialState: SessionState = {
  sessions: [],
  newSessionName: "",
  newSessionType: 'lesson',
  selectedItemListId: "",
  teamCount: 2,
  isSubmitting: false,
};

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'SET_NEW_SESSION_NAME':
      return { ...state, newSessionName: action.payload };
    case 'SET_NEW_SESSION_TYPE':
      return { ...state, newSessionType: action.payload };
    case 'SET_SELECTED_ITEM_LIST_ID':
      return { ...state, selectedItemListId: action.payload };
    case 'SET_TEAM_COUNT':
      return { ...state, teamCount: action.payload };
    case 'SET_IS_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'RESET_FORM':
      return { 
        ...state, 
        newSessionName: "", 
        selectedItemListId: "", 
        teamCount: 2,
        isSubmitting: false 
      };
    default:
      return state;
  }
}

const SessionManager: React.FC<SessionManagerProps> = ({ itemLists, onViewResults, setNotification }) => {
    const [state, dispatch] = useReducer(sessionReducer, initialState);
    const [isOnline, setIsOnline] = useState(true);
    const mountedRef = useRef<boolean>(true);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // マウント状態の管理
    useEffect(() => {
        mountedRef.current = true;
        
        // オンライン状態の監視
        const checkConnection = async () => {
            const connected = await firebaseNetworkHelpers.checkConnection() as boolean;
            if (mountedRef.current) {
                setIsOnline(connected);
            }
        };
        
        // 初回チェック
        checkConnection();
        
        // 定期的な接続チェック（30秒ごと）
        const connectionCheckInterval = setInterval(checkConnection, 30000);
        
        return () => {
            mountedRef.current = false;
            clearInterval(connectionCheckInterval);
            // クリーンアップ時にFirestoreリスナーも停止
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    useEffect(() => {
        if (!mountedRef.current) return;
        
        const sessionsQuery = query(collection(db, "artifacts", appId, "public", "data", "trainingSessions"));
        const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
            if (!mountedRef.current) return; // アンマウント後は状態を更新しない
            
            try {
                const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
                dispatch({ 
                    type: 'SET_SESSIONS', 
                    payload: sessionsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                });
                
                // 成功時はオンライン状態を更新
                setIsOnline(true);
            } catch (error) {
                console.error('Error processing sessions data:', error);
                if (mountedRef.current) {
                    setNotification({ type: 'error', message: 'セッションデータの処理中にエラーが発生しました。' });
                }
            }
        }, (error) => {
            console.error('Firestore connection error:', error);
            if (mountedRef.current) {
                setIsOnline(false);
                
                // 接続エラーの種類に応じてメッセージを変更
                if (error.code === 'unavailable') {
                    setNotification({ 
                        type: 'error', 
                        message: 'インターネット接続を確認してください。オフラインモードで動作しています。' 
                    });
                } else {
                    setNotification({ 
                        type: 'error', 
                        message: 'データベース接続エラーが発生しました。しばらく後にお試しください。' 
                    });
                }
            }
        });
        
        unsubscribeRef.current = unsubscribe;
        
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, [setNotification]);

    const generateAccessCode = (): string => Math.floor(1000 + Math.random() * 9000).toString();

    const createSession = useCallback(async () => {
        if (!mountedRef.current || !state.newSessionName || !state.selectedItemListId) { 
            if (mountedRef.current) {
                setNotification({ type: 'error', message: '必要な項目を入力してください。' }); 
            }
            return; 
        }
        
        if (state.isSubmitting) return; // 重複実行を防止
        
        dispatch({ type: 'SET_IS_SUBMITTING', payload: true });
        try {
            const sessionDoc = await addDoc(collection(db, "artifacts", appId, "public", "data", "trainingSessions"), {
                name: state.newSessionName,
                type: state.newSessionType,
                itemListId: state.selectedItemListId,
                accessCode: generateAccessCode(),
                createdAt: serverTimestamp(),
                isActive: false
            });
            
            if (state.newSessionType === 'lesson' && mountedRef.current) {
                const teamPromises = [];
                for (let i = 1; i <= state.teamCount; i++) {
                    teamPromises.push(
                        addDoc(collection(db, "artifacts", appId, "public", "data", "trainingSessions", sessionDoc.id, "teams"), {
                            teamNumber: i,
                            accessCode: generateAccessCode(),
                            selectedItems: [],
                            isSubmitted: false,
                            createdAt: serverTimestamp()
                        })
                    );
                }
                await Promise.all(teamPromises);
            }
            
            if (mountedRef.current) {
                setNotification({ type: 'success', message: 'セッションを作成しました。' });
                dispatch({ type: 'SET_NEW_SESSION_NAME', payload: '' });
                dispatch({ type: 'SET_SELECTED_ITEM_LIST_ID', payload: '' });
                dispatch({ type: 'SET_TEAM_COUNT', payload: 2 });
            }
        } catch (error) {
            console.error('Error creating session:', error);
            if (mountedRef.current) {
                setNotification({ type: 'error', message: 'セッション作成中にエラーが発生しました。' });
            }
        } finally {
            if (mountedRef.current) {
                dispatch({ type: 'SET_IS_SUBMITTING', payload: false });
            }
        }
    }, [state.newSessionName, state.selectedItemListId, state.newSessionType, state.teamCount, state.isSubmitting, setNotification]);

    const deleteSession = useCallback(async (sessionId: string) => {
        if (!mountedRef.current || !confirm('このセッションを削除しますか？この操作は取り消せません。')) return;
        try {
            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "trainingSessions", sessionId));
            if (mountedRef.current) {
                setNotification({ type: 'success', message: 'セッションを削除しました。' });
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            if (mountedRef.current) {
                setNotification({ type: 'error', message: 'セッション削除中にエラーが発生しました。' });
            }
        }
    }, [setNotification]);

    const resetSession = async (session: Session) => {
        if (!confirm('このセッションをリセットしますか？すべての回答が削除されます。')) return;
        try {
            const sessionRef = doc(db, "artifacts", appId, "public", "data", "trainingSessions", session.id);
            
            if (session.type === 'lesson') {
                const teamsSnapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "trainingSessions", session.id, "teams"));
                for (const teamDoc of teamsSnapshot.docs) {
                    await updateDoc(teamDoc.ref, { selectedItems: [], isSubmitted: false, submittedAt: null });
                }
            } else {
                const participantsSnapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "trainingSessions", session.id, "participants"));
                for (const participantDoc of participantsSnapshot.docs) {
                    await deleteDoc(participantDoc.ref);
                }
            }
            
            await updateDoc(sessionRef, { accessCode: generateAccessCode(), isActive: false });
            setNotification({ type: 'success', message: 'セッションをリセットしました。' });
        } catch (error) {
            console.error('Error resetting session:', error);
            setNotification({ type: 'error', message: 'セッションリセット中にエラーが発生しました。' });
        }
    };

    const copyAccessCode = (accessCode: string) => {
        navigator.clipboard.writeText(accessCode);
        setNotification({ type: 'success', message: 'アクセスコードをコピーしました。' });
    };

    return (
        <div className="space-y-6 mt-6">
            {/* 接続状態インジケーター */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm">
                    {isOnline ? (
                        <>
                            <Wifi size={16} className="text-green-500" />
                            <span className="text-green-600 dark:text-green-400">オンライン</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={16} className="text-red-500" />
                            <span className="text-red-600 dark:text-red-400">オフライン</span>
                        </>
                    )}
                </div>
            </div>

            {/* セッション作成フォーム */}
            <Card>
                <div className="space-y-4">
                    {/* セッション名入力 */}
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-2">セッション名</label>
                        <input 
                            type="text" 
                            value={state.newSessionName}
                            onChange={(e) => dispatch({ type: 'SET_NEW_SESSION_NAME', payload: e.target.value })}
                            className="w-full p-3 rounded-lg theme-bg-input theme-text-primary border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="例: 1組 防災訓練"
                        />
                    </div>

                    {/* セッションタイプ選択ボタン */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => dispatch({ type: 'SET_NEW_SESSION_TYPE', payload: 'lesson' })}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                                state.newSessionType === 'lesson'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 theme-text-primary hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            授業（チーム制）
                        </button>
                        <button
                            onClick={() => dispatch({ type: 'SET_NEW_SESSION_TYPE', payload: 'workshop' })}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                                state.newSessionType === 'workshop'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 theme-text-primary hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            ワークショップ（個人参加）
                        </button>
                    </div>

                    {/* チーム数（授業モード時のみ） */}
                    {state.newSessionType === 'lesson' && (
                        <div>
                            <label className="block text-sm font-medium theme-text-primary mb-2">チーム数</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="50" 
                                value={state.teamCount}
                                onChange={(e) => dispatch({ type: 'SET_TEAM_COUNT', payload: parseInt(e.target.value) || 2 })}
                                className="w-full p-3 rounded-lg theme-bg-input theme-text-primary border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="チーム数を入力してください"
                                placeholder="2"
                            />
                        </div>
                    )}

                    {/* アイテムリスト選択 */}
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-2">アイテムリスト</label>
                        <select 
                            value={state.selectedItemListId}
                            onChange={(e) => dispatch({ type: 'SET_SELECTED_ITEM_LIST_ID', payload: e.target.value })}
                            className="w-full p-3 rounded-lg theme-bg-input theme-text-primary border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="使用するアイテムリストを選択してください"
                        >
                            <option value="">基本セット</option>
                            {itemLists.filter(itemList => !itemList.isDefault).map((itemList) => (
                                <option key={itemList.id} value={itemList.id}>{itemList.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* セッション作成ボタン */}
                    <Button 
                        onClick={createSession} 
                        disabled={state.isSubmitting || !state.newSessionName || !isOnline}
                        className="w-full py-3 text-lg bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50"
                        icon={Plus}
                    >
                        {!isOnline 
                            ? 'オフライン（セッション作成不可）' 
                            : state.isSubmitting 
                                ? 'セッション作成中...' 
                                : 'セッション作成'
                        }
                    </Button>
                </div>
            </Card>

            {/* 既存のセッション一覧 */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold theme-text-primary">既存のセッション</h3>
                    <div className="flex items-center gap-2 text-sm theme-text-secondary">
                        <Users size={16} />
                        <span>新しい順</span>
                    </div>
                </div>

                <Card>
                    {state.sessions.length === 0 ? (
                        <div className="text-center py-8 theme-text-secondary">
                            まだセッションがありません。上記のフォームから新しいセッションを作成してください。
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {state.sessions.map((session) => (
                                <div key={session.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 pb-4 last:pb-0">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="text-lg font-semibold theme-text-primary">{session.name}</h4>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    session.type === 'lesson' 
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                                }`}>
                                                    {session.type === 'lesson' ? '授業' : 'ワークショップ'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm theme-text-secondary">
                                                <span>アクセスコード: <span className="font-mono font-bold text-lg">{session.accessCode}</span></span>
                                                <button 
                                                    onClick={() => copyAccessCode(session.accessCode)} 
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                                                    title="コピー"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Button onClick={() => onViewResults(session)} icon={Play} className="text-sm">
                                                結果を見る
                                            </Button>
                                            <IconButton onClick={() => resetSession(session)} title="リセット" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <RotateCcw size={16} />
                                            </IconButton>
                                            <IconButton onClick={() => deleteSession(session.id)} title="削除" className="theme-delete-icon hover:bg-red-50 dark:hover:bg-red-900/20">
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default SessionManager;