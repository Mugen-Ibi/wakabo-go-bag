import React, { useState, useEffect } from 'react';
import { db, appId, collection, query, onSnapshot, getDocs, addDoc, serverTimestamp } from '../../lib/firebase';
import { INITIAL_DEFAULT_ITEMS } from '../../lib/utils';
import { Card, Modal } from '../../components/ui';
import SessionManager from './SessionManager';
import ItemListManager from './ItemListManager';
import ResultsDashboard from './ResultsDashboard';
import { Clapperboard, List } from 'lucide-react';
import type { ItemList, NotificationType, Session } from '../../types';
import { toMillis, formatJaDateFrom } from '../../lib/time';

interface AdminHubProps {
    setNotification: (n: NotificationType) => void;
}

const AdminHub: React.FC<AdminHubProps> = ({ setNotification }) => {
    const [view, setView] = useState<'sessions' | 'lists' | 'results'>('sessions');
    const [itemLists, setItemLists] = useState<ItemList[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadItemLists = async () => {
            try {
                const itemListsCollection = collection(db, "artifacts", appId, "public", "data", "itemLists");

                // 最初に既存のデータを確認
                const existingSnapshot = await getDocs(itemListsCollection);
                const existingLists = existingSnapshot.docs.map(d => ({
                    id: d.id,
                    name: d.data().name || '',
                    items: d.data().items || [],
                    isDefault: d.data().isDefault || false
                }));

                // デフォルトリストが存在しない場合は作成
                if (!existingLists.some(list => list.isDefault)) {
                    console.log('デフォルトアイテムリストを作成中...');
                    await addDoc(itemListsCollection, {
                        name: "基本セット",
                        items: INITIAL_DEFAULT_ITEMS,
                        isDefault: true,
                        createdAt: serverTimestamp()
                    });
                    setNotification({ type: 'success', message: '基本アイテムリストを作成しました。' });
                }

                // リアルタイム監視を開始
                const q = query(itemListsCollection);
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const lists = snapshot.docs.map(d => ({
                        id: d.id,
                        name: d.data().name || '',
                        items: d.data().items || [],
                        isDefault: d.data().isDefault || false
                    }));

                    setItemLists(lists);
                    setIsLoading(false);
                });
                return unsubscribe;
            } catch (error) {
                console.error('アイテムリストの読み込みに失敗:', error);
                setNotification({ type: 'error', message: 'アイテムリストの読み込みに失敗しました。' });
                setIsLoading(false);
            }
        };

        loadItemLists();
    }, [setNotification]);

    // セッション一覧を購読（結果分析ページで選択できるように）
    useEffect(() => {
        const sessionsCollection = collection(db, "artifacts", appId, "public", "data", "trainingSessions");
        const q = query(sessionsCollection);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Session[];
            // createdAt の降順で並べる
            list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
            setSessions(list);
        });
        return () => unsubscribe();
    }, []);

    const handleViewResults = (session: Session) => {
        setSelectedSession(session);
        setView('results');
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-foreground">アイテムリストを読み込み中...</p>
                </div>
            );
        }

        switch (view) {
            case 'sessions':
                if (itemLists.length === 0) {
                    return (
                        <div className="text-center p-10">
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <List className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">アイテムリストが必要です</h3>
                                <p className="text-muted-foreground mb-6">セッションを作成する前に、まずアイテムリストを作成してください。</p>
                                <button
                                    onClick={() => setView('lists')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    アイテムリスト管理へ
                                </button>
                            </div>
                        </div>
                    );
                }
                return <SessionManager itemLists={itemLists} onViewResults={handleViewResults} setNotification={setNotification} />;
            case 'lists':
                return <ItemListManager itemLists={itemLists} setNotification={setNotification} />;
            case 'results':
                return (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <label htmlFor="results-session-select" className="text-sm text-muted-foreground">セッション選択</label>
                                <select
                                    id="results-session-select"
                                    aria-label="結果分析で表示するセッション"
                                    value={selectedSession?.id || ''}
                                    onChange={(e) => {
                                        const s = sessions.find((x) => x.id === e.target.value) || null;
                                        setSelectedSession(s);
                                    }}
                                    className="px-2 py-1 rounded bg-input text-foreground border border-border text-sm"
                                >
                                    <option value="">未選択</option>
                                    {sessions.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {(s.name || '(名称未設定)')} / {s.type} / 作成: {formatJaDateFrom(s.createdAt)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {selectedSession && (
                                <button
                                    className="text-sm text-muted-foreground hover:underline"
                                    onClick={() => setSelectedSession(null)}
                                >
                                    選択をクリア
                                </button>
                            )}
                        </div>
                        {selectedSession ? (
                            <ResultsDashboard
                                session={selectedSession}
                                itemList={itemLists.find(l => l.id === selectedSession.itemListId) || { id: 'dummy', name: 'Unknown', items: [], createdAt: null, updatedAt: null }}
                                onBack={() => setSelectedSession(null)}
                            />
                        ) : (
                            <div className="text-center p-10 text-foreground">セッションを選択してください</div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* タブナビゲーション */}
            <div className="flex items-center gap-2 p-1.5 bg-secondary/30 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm">
                <button
                    onClick={() => setView('sessions')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex-1 justify-center ${view === 'sessions'
                            ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        }`}
                >
                    <Clapperboard size={20} className={view === 'sessions' ? 'animate-in zoom-in duration-300' : ''} />
                    <span>セッション管理</span>
                </button>
                <button
                    onClick={() => setView('lists')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex-1 justify-center ${view === 'lists'
                            ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        }`}
                >
                    <List size={20} className={view === 'lists' ? 'animate-in zoom-in duration-300' : ''} />
                    <span>アイテム管理</span>
                </button>
            </div>

            {/* コンテンツエリア */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminHub;
