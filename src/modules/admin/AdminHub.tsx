import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { INITIAL_DEFAULT_ITEMS } from '../../lib/helpers';
import { Card, Modal } from '../../components/ui';
import SessionManager from './SessionManager';
import ItemListManager from './ItemListManager';
import ResultsDashboard from './ResultsDashboard';
import { Clapperboard, List } from 'lucide-react';
import type { ItemList, NotificationType, Session } from '../../types';

interface AdminHubProps {
  setNotification: (n: NotificationType) => void;
}

const AdminHub: React.FC<AdminHubProps> = ({ setNotification }) => {
    const [view, setView] = useState<'sessions' | 'lists' | 'results'>('sessions'); // デフォルトをsessionsに戻す
    const [itemLists, setItemLists] = useState<ItemList[]>([]);
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
    }, [setNotification]); // viewを依存配列から削除

    const handleViewResults = (session: Session) => {
        setSelectedSession(session);
        setView('results');
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="theme-text-primary">アイテムリストを読み込み中...</p>
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
                                <h3 className="text-xl font-semibold theme-text-primary mb-2">アイテムリストが必要です</h3>
                                <p className="theme-text-secondary mb-6">セッションを作成する前に、まずアイテムリストを作成してください。</p>
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
                return selectedSession ? <ResultsDashboard session={selectedSession} /> : <div className="text-center p-10 theme-text-primary">セッションが選択されていません</div>;
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* ヘッダー */}
            <div className="text-center">
                <h1 className="text-3xl font-bold theme-text-primary mb-2">管理者モード</h1>
                <p className="theme-text-secondary">防災持ち出し袋作成支援ツールの管理画面です</p>
            </div>

            {/* タブナビゲーション */}
            <Card>
                <div className="grid grid-cols-3 gap-1 p-2 theme-bg-input rounded-lg">
                    <button
                        onClick={() => setView('sessions')}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-2 p-3 rounded-md text-sm font-semibold transition-all disabled:opacity-50 ${
                            view === 'sessions' 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'theme-text-secondary hover:theme-bg-secondary hover:theme-text-primary'
                        }`}
                    >
                        <Clapperboard size={18} />
                        セッション管理
                        {itemLists.length === 0 && !isLoading && (
                            <span className="ml-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                    </button>
                    <button
                        onClick={() => setView('lists')}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-2 p-3 rounded-md text-sm font-semibold transition-all disabled:opacity-50 ${
                            view === 'lists' 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'theme-text-secondary hover:theme-bg-secondary hover:theme-text-primary'
                        }`}
                    >
                        <List size={18} />
                        リスト管理
                        {itemLists.length === 0 && !isLoading && (
                            <span className="ml-1 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">推奨</span>
                        )}
                    </button>
                    <button
                        onClick={() => setView('results')}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-2 p-3 rounded-md text-sm font-semibold transition-all disabled:opacity-50 ${
                            view === 'results' 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'theme-text-secondary hover:theme-bg-secondary hover:theme-text-primary'
                        }`}
                    >
                        結果分析
                    </button>
                </div>
            </Card>

            {/* メインコンテンツ */}
            <Card>
                {renderContent()}
            </Card>
        </div>
    );
};

export default AdminHub;
