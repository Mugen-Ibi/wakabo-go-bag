import React, { useReducer, useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { appId, firebaseNetworkHelpers } from '../../lib/firebase';
import { debounce } from '../../lib/utils';
import { Card, Button, IconButton } from '../../components/ui';
import { Plus, Play, Users, User, Trash2, Copy, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import type { Session, ItemList, NotificationType } from '../../types';
import { toMillis, formatJaDateFrom } from '../../lib/time';

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
    const [teamCodes, setTeamCodes] = useState<{[sessionId: string]: Array<{id: string, teamNumber: number, accessCode: string}>}>({});
    const mountedRef = useRef<boolean>(true);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const createSessionRef = useRef<boolean>(false);

    // チーム情報を取得する関数
    const loadTeamCodes = useCallback(async (sessionId: string) => {
        try {
            const { db } = await import('../../lib/firebase');
            const { collection, getDocs } = await import('firebase/firestore');
            if (!db) return;
            
            const teamsSnapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "trainingSessions", sessionId, "teams"));
            const teams: Array<{ id: string; teamNumber: number; accessCode: string }> = teamsSnapshot.docs
                .map((d) => {
                    const data = d.data() as { teamNumber?: number; accessCode?: string };
                    return { id: d.id, teamNumber: data.teamNumber ?? 0, accessCode: data.accessCode ?? '' };
                })
                .sort((a, b) => a.teamNumber - b.teamNumber);
            
            setTeamCodes(prev => ({
                ...prev,
                [sessionId]: teams
            }));
        } catch (error) {
            console.error('Error loading team codes:', error);
        }
    }, []);

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
        
        // 既にリスナーが登録されている場合は何もしない
        if (unsubscribeRef.current) {
            return;
        }
        
        // Firebaseインスタンスを動的に取得してリスナーを設定
        import('../../lib/firebase').then(({ db }) => {
            if (!mountedRef.current || !db) return;
            
            const sessionsQuery = query(collection(db, "artifacts", appId, "public", "data", "trainingSessions"));
            const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
                if (!mountedRef.current) return; // アンマウント後は状態を更新しない
                
                try {
                    const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as Session));
                    dispatch({ 
                        type: 'SET_SESSIONS', 
                        payload: sessionsData.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
                    });
                    
                    // lesson タイプのセッションのチーム情報を読み込む
                    sessionsData
                        .filter(session => session.type === 'lesson')
                        .forEach(session => {
                            loadTeamCodes(session.id);
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
        }).catch(error => {
            console.error('Failed to load Firebase:', error);
            if (mountedRef.current) {
                setNotification({ type: 'error', message: 'Firebase の初期化に失敗しました。' });
            }
        });
    }, [setNotification, loadTeamCodes]);

    // アクセスコード生成関数
    const generateAccessCode = () => Math.floor(1000 + Math.random() * 9000).toString();

    // セッション作成関数（内部）
    const createSessionInternal = useCallback(async () => {
        if (createSessionRef.current) return; // 重複実行を防止
        
        if (!mountedRef.current || !state.newSessionName || !state.selectedItemListId) {
            if (mountedRef.current) {
                setNotification({ type: 'error', message: '必要な項目を入力してください。' });
            }
            return;
        }
        
        if (state.isSubmitting) return; // 重複実行を防止
        
        createSessionRef.current = true;
        dispatch({ type: 'SET_IS_SUBMITTING', payload: true });
        
        try {
            // Firebaseインスタンスを動的に取得
            const { db } = await import('../../lib/firebase');
            if (!db) throw new Error('Firebase database not initialized');
            
            const sessionData: {
                name: string;
                type: 'lesson' | 'workshop';
                itemListId: string;
                createdAt: ReturnType<typeof serverTimestamp>;
                isActive: boolean;
                accessCode?: string;
            } = {
                name: state.newSessionName,
                type: state.newSessionType,
                itemListId: state.selectedItemListId,
                createdAt: serverTimestamp(),
                isActive: false
            };
            
            // workshopタイプの場合のみセッション自体にaccessCodeを設定
            if (state.newSessionType === 'workshop') {
                sessionData.accessCode = generateAccessCode();
            }
            
            const sessionDoc = await addDoc(collection(db, "artifacts", appId, "public", "data", "trainingSessions"), sessionData);
            
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
                
                // チーム情報を読み込む
                await loadTeamCodes(sessionDoc.id);
            }
            
            if (mountedRef.current) {
                setNotification({ type: 'success', message: 'セッションを作成しました。' });
                dispatch({ type: 'RESET_FORM' });
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
            createSessionRef.current = false;
        }
    }, [state.newSessionName, state.selectedItemListId, state.newSessionType, state.teamCount, state.isSubmitting, setNotification]);

    // デバウンスされたセッション作成関数（1秒間の連続クリックを防止）
    const createSession = useMemo(
        () => debounce(createSessionInternal, 1000),
        [createSessionInternal]
    );

    const deleteSession = useCallback(async (sessionId: string) => {
        if (!mountedRef.current || !confirm('このセッションを削除しますか？この操作は取り消せません。')) return;
        
        try {
            const { db } = await import('../../lib/firebase');
            if (!db) throw new Error('Firebase database not initialized');
            
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
            const { db } = await import('../../lib/firebase');
            if (!db) throw new Error('Firebase database not initialized');
            
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
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold theme-text-primary mb-2">新しいセッションを作成</h3>
                        <p className="theme-text-secondary">授業やワークショップで使用するセッションを作成します</p>
                    </div>

                    {/* セッション名入力 */}
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-2">
                            セッション名 <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={state.newSessionName}
                            onChange={(e) => dispatch({ type: 'SET_NEW_SESSION_NAME', payload: e.target.value })}
                            placeholder="例: 1年A組 防災訓練"
                            className="w-full px-4 py-3 theme-input text-lg"
                            disabled={state.isSubmitting}
                        />
                    </div>

                    {/* セッションタイプ選択 */}
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-3">
                            セッションタイプ <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 p-1 theme-bg-input rounded-lg">
                            <label className={`flex flex-col items-center p-4 rounded-md cursor-pointer transition-all border-2 ${
                                state.newSessionType === 'lesson' 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                                    : 'theme-bg-secondary theme-text-secondary border-transparent hover:theme-bg-hover hover:border-blue-200'
                            }`}>
                                <input 
                                    type="radio" 
                                    value="lesson" 
                                    checked={state.newSessionType === 'lesson'}
                                    onChange={() => dispatch({ type: 'SET_NEW_SESSION_TYPE', payload: 'lesson' })}
                                    className="hidden"
                                    disabled={state.isSubmitting}
                                />
                                <Users className="w-8 h-8 mb-2" />
                                <span className="font-semibold">授業（チーム分け）</span>
                                <span className="text-sm opacity-75 mt-1">複数チームでの参加</span>
                            </label>
                            <label className={`flex flex-col items-center p-4 rounded-md cursor-pointer transition-all border-2 ${
                                state.newSessionType === 'workshop' 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                                    : 'theme-bg-secondary theme-text-secondary border-transparent hover:theme-bg-hover hover:border-blue-200'
                            }`}>
                                <input 
                                    type="radio" 
                                    value="workshop" 
                                    checked={state.newSessionType === 'workshop'}
                                    onChange={() => dispatch({ type: 'SET_NEW_SESSION_TYPE', payload: 'workshop' })}
                                    className="hidden"
                                    disabled={state.isSubmitting}
                                />
                                <User className="w-8 h-8 mb-2" />
                                <span className="font-semibold">ワークショップ（個人参加）</span>
                                <span className="text-sm opacity-75 mt-1">個人での参加</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* チーム数設定（授業モードのみ） */}
                        {state.newSessionType === 'lesson' && (
                            <div>
                                <label className="block text-sm font-medium theme-text-primary mb-2">
                                    チーム数 <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        title="チーム数"
                                        value={state.teamCount}
                                        onChange={(e) => dispatch({ type: 'SET_TEAM_COUNT', payload: Math.max(1, parseInt(e.target.value) || 1) })}
                                        min="1"
                                        max="20"
                                        className="w-full px-4 py-3 theme-input text-lg text-center font-semibold"
                                        disabled={state.isSubmitting}
                                    />
                                    <div className="mt-1 text-xs text-gray-500 text-center">
                                        各チームに個別の参加コードが生成されます
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* アイテムリスト選択 */}
                        <div className={state.newSessionType === 'lesson' ? '' : 'md:col-span-2'}>
                            <label className="block text-sm font-medium theme-text-primary mb-2">
                                アイテムリスト <span className="text-red-500">*</span>
                            </label>
                            <select 
                                title="アイテムリスト"
                                value={state.selectedItemListId}
                                onChange={(e) => dispatch({ type: 'SET_SELECTED_ITEM_LIST_ID', payload: e.target.value })}
                                className="w-full px-4 py-3 theme-input text-lg"
                                disabled={state.isSubmitting}
                            >
                                <option value="">アイテムリストを選択してください</option>
                                {itemLists.map(list => (
                                    <option key={list.id} value={list.id}>
                                        {list.name}
                                        {list.isDefault && ' (基本)'}
                                    </option>
                                ))}
                            </select>
                            {state.selectedItemListId && (
                                <div className="mt-1 text-xs text-gray-500">
                                    選択されたリスト: {itemLists.find(l => l.id === state.selectedItemListId)?.items.length || 0}個のアイテム
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 作成ボタン */}
                    <div className="flex justify-center pt-6 border-t theme-border">
                        <Button 
                            onClick={createSession}
                            disabled={state.isSubmitting || !state.newSessionName || !state.selectedItemListId || itemLists.length === 0}
                            className={`flex items-center px-8 py-4 text-lg font-semibold rounded-xl transition-all ${
                                state.isSubmitting || !state.newSessionName || !state.selectedItemListId || itemLists.length === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-105'
                            }`}
                        >
                            {state.isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                    セッション作成中...
                                </>
                            ) : (
                                <>
                                    <Plus size={20} className="mr-3" />
                                    セッション作成
                                </>
                            )}
                        </Button>
                    </div>
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
                                            <div className="text-sm theme-text-secondary">
                                                {session.type === 'lesson' ? (
                                                    <div>
                                                        <div className="mb-2">
                                                            <span>作成: {formatJaDateFrom(session.createdAt)}</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="font-medium">チーム別参加コード:</span>
                                                            {teamCodes[session.id] ? (
                                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                                    {teamCodes[session.id].map((team) => (
                                                                        <div key={team.id} className="flex items-center justify-between theme-bg-secondary theme-border px-3 py-2 rounded">
                                                                            <span className="text-sm theme-text-primary">チーム {team.teamNumber}:</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <strong className="font-mono text-sm theme-text-primary">{team.accessCode}</strong>
                                                                                <button
                                                                                    onClick={() => copyAccessCode(team.accessCode)}
                                                                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                                                    title="コピー"
                                                                                >
                                                                                    <Copy size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="theme-text-secondary">読み込み中...</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-4">
                                                        <span className="theme-text-primary">共通コード: <strong className="font-mono theme-text-primary">{session.accessCode}</strong></span>
                                                        <span className="theme-text-secondary">作成: {formatJaDateFrom(session.createdAt)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {session.type === 'workshop' && session.accessCode && (
                                                <IconButton onClick={() => copyAccessCode(session.accessCode!)} title="コードをコピー" className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                    <Copy size={16} />
                                                </IconButton>
                                            )}
                                            <IconButton onClick={() => onViewResults(session)} title="結果を見る" className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                                                <Play size={16} />
                                            </IconButton>
                                            <IconButton onClick={() => resetSession(session)} title="リセット" className="text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20">
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