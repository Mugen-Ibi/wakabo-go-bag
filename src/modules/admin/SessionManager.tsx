import React, { useReducer, useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { appId, firebaseNetworkHelpers, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from '../../lib/firebase';
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
    const [teamCodes, setTeamCodes] = useState<{ [sessionId: string]: Array<{ id: string, teamNumber: number, accessCode: string }> }>({});
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
        <div className="space-y-8 mt-8">
            {/* 接続状態インジケーター */}
            <div className="flex items-center justify-end mb-4">
                <div className="flex items-center gap-2 text-sm font-medium bg-muted/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
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
            <Card className="border-primary/10 shadow-lg">
                <div className="space-y-8">
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-foreground mb-2">新しいセッションを作成</h3>
                        <p className="text-muted-foreground">授業やワークショップで使用するセッションを作成します</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 左カラム: 基本情報 */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    セッション名 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={state.newSessionName}
                                    onChange={(e) => dispatch({ type: 'SET_NEW_SESSION_NAME', payload: e.target.value })}
                                    placeholder="例: 1年A組 防災訓練"
                                    className="w-full px-4 py-3 bg-input/50 border border-input text-foreground rounded-xl text-lg focus:ring-2 focus:ring-primary/20 transition-all"
                                    disabled={state.isSubmitting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-3">
                                    セッションタイプ <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all border-2 ${state.newSessionType === 'lesson'
                                        ? 'bg-primary/5 border-primary text-primary'
                                        : 'bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary hover:border-primary/30'
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
                                        <span className="font-bold">授業</span>
                                        <span className="text-xs opacity-75 mt-1">チーム分けあり</span>
                                    </label>
                                    <label className={`flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all border-2 ${state.newSessionType === 'workshop'
                                        ? 'bg-primary/5 border-primary text-primary'
                                        : 'bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary hover:border-primary/30'
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
                                        <span className="font-bold">ワークショップ</span>
                                        <span className="text-xs opacity-75 mt-1">個人参加</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 右カラム: 詳細設定 */}
                        <div className="space-y-6">
                            {state.newSessionType === 'lesson' && (
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
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
                                            className="w-full px-4 py-3 bg-input/50 border border-input text-foreground rounded-xl text-lg text-center font-bold"
                                            disabled={state.isSubmitting}
                                        />
                                        <div className="mt-2 text-xs text-muted-foreground text-center">
                                            各チームに個別の参加コードが生成されます
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={state.newSessionType === 'lesson' ? '' : 'pt-0'}>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    使用するアイテムリスト <span className="text-red-500">*</span>
                                </label>
                                <select
                                    title="アイテムリスト"
                                    value={state.selectedItemListId}
                                    onChange={(e) => dispatch({ type: 'SET_SELECTED_ITEM_LIST_ID', payload: e.target.value })}
                                    className="w-full px-4 py-3 bg-input/50 border border-input text-foreground rounded-xl text-lg focus:ring-2 focus:ring-primary/20 transition-all"
                                    disabled={state.isSubmitting}
                                >
                                    <option value="">リストを選択してください</option>
                                    {itemLists.map(list => (
                                        <option key={list.id} value={list.id}>
                                            {list.name}
                                            {list.isDefault && ' (基本)'}
                                        </option>
                                    ))}
                                </select>
                                {state.selectedItemListId && (
                                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        選択中: {itemLists.find(l => l.id === state.selectedItemListId)?.items.length || 0}個のアイテム
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 作成ボタン */}
                    <div className="flex justify-center pt-6 border-t border-border/50">
                        <Button
                            onClick={createSession}
                            disabled={state.isSubmitting || !state.newSessionName || !state.selectedItemListId || itemLists.length === 0}
                            size="lg"
                            className={`w-full md:w-auto min-w-[200px] text-lg font-bold shadow-lg hover:shadow-xl transition-all ${state.isSubmitting || !state.newSessionName || !state.selectedItemListId || itemLists.length === 0
                                ? 'opacity-50 cursor-not-allowed'
                                : 'bg-primary hover:bg-primary/90 hover:-translate-y-0.5'
                                }`}
                        >
                            {state.isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                    作成中...
                                </>
                            ) : (
                                <>
                                    <Plus size={20} className="mr-2" />
                                    セッションを作成
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* 既存のセッション一覧 */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-xl font-bold text-foreground">履歴</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-lg">
                        <Users size={14} />
                        <span>新しい順</span>
                    </div>
                </div>

                {state.sessions.length === 0 ? (
                    <Card className="border-dashed border-2 bg-muted/10">
                        <div className="text-center py-12 text-muted-foreground">
                            <p>まだセッションがありません</p>
                            <p className="text-sm mt-1">上のフォームから新しいセッションを作成してください</p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {state.sessions.map((session) => (
                            <Card key={session.id} className="hover:border-primary/30 transition-colors group">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{session.name}</h4>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${session.type === 'lesson'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                                : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                                                }`}>
                                                {session.type === 'lesson' ? '授業' : 'ワークショップ'}
                                            </span>
                                        </div>

                                        <div className="text-sm text-muted-foreground">
                                            {session.type === 'lesson' ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">
                                                        <span>チーム別参加コード</span>
                                                    </div>
                                                    {teamCodes[session.id] ? (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                            {teamCodes[session.id].map((team) => (
                                                                <div key={team.id} className="flex flex-col bg-secondary/30 border border-border/50 p-2 rounded-lg text-center">
                                                                    <span className="text-xs text-muted-foreground mb-1">チーム {team.teamNumber}</span>
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <strong className="font-mono text-base text-foreground tracking-wider">{team.accessCode}</strong>
                                                                        <button
                                                                            onClick={() => copyAccessCode(team.accessCode)}
                                                                            className="text-primary hover:text-primary/80 transition-colors p-1 hover:bg-primary/10 rounded"
                                                                            title="コピー"
                                                                        >
                                                                            <Copy size={12} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="animate-pulse h-8 bg-muted/50 rounded w-full max-w-md"></div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4 bg-secondary/30 inline-flex px-4 py-2 rounded-lg border border-border/50">
                                                    <span className="text-sm font-medium">共通コード</span>
                                                    <strong className="font-mono text-xl text-foreground tracking-wider">{session.accessCode}</strong>
                                                    <button
                                                        onClick={() => copyAccessCode(session.accessCode!)}
                                                        className="text-primary hover:text-primary/80 transition-colors p-1.5 hover:bg-primary/10 rounded-md"
                                                        title="コピー"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="mt-3 text-xs text-muted-foreground/70 flex items-center gap-2">
                                                <span>作成: {formatJaDateFrom(session.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <Button
                                            onClick={() => onViewResults(session)}
                                            variant="secondary"
                                            size="sm"
                                            className="gap-2 font-semibold"
                                        >
                                            <Play size={16} className="text-green-600" />
                                            結果を見る
                                        </Button>

                                        <div className="w-px h-8 bg-border mx-1"></div>

                                        <IconButton onClick={() => resetSession(session)} title="リセット" className="text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                                            <RotateCcw size={18} />
                                        </IconButton>
                                        <IconButton onClick={() => deleteSession(session.id)} title="削除" className="text-destructive hover:bg-destructive/10">
                                            <Trash2 size={18} />
                                        </IconButton>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionManager;