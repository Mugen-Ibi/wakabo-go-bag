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
    const [view, setView] = useState<'sessions' | 'lists' | 'results'>('sessions');
    const [itemLists, setItemLists] = useState<ItemList[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    useEffect(() => {
        const itemListsCollection = collection(db, "artifacts", appId, "public", "data", "itemLists");
        const q = query(itemListsCollection);
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const lists = snapshot.docs.map(d => ({
                id: d.id,
                name: d.data().name || '',
                items: d.data().items || [],
                isDefault: d.data().isDefault || false
            }));
            
            // デフォルトリストが存在しない場合は作成
            if (!lists.some(list => list.isDefault)) {
                await addDoc(itemListsCollection, {
                    name: "基本セット",
                    items: INITIAL_DEFAULT_ITEMS,
                    isDefault: true,
                    createdAt: serverTimestamp()
                });
            }
            
            setItemLists(lists);
        });
        return unsubscribe;
    }, []);

    const handleViewResults = (session: Session) => {
        setSelectedSession(session);
        setView('results');
    };

    const renderContent = () => {
        switch (view) {
            case 'sessions':
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
        <div className="w-full max-w-5xl mx-auto">
            <Card>
                <div className="grid grid-cols-3 gap-1 p-2 theme-bg-input rounded-lg">
                    <button
                        onClick={() => setView('sessions')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-md text-sm font-semibold transition-all ${
                            view === 'sessions' ? 'bg-blue-600 text-white shadow' : 'theme-text-secondary hover:theme-bg-secondary'
                        }`}
                    >
                        <Clapperboard size={18} />
                        セッション管理
                    </button>
                    <button
                        onClick={() => setView('lists')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-md text-sm font-semibold transition-all ${
                            view === 'lists' ? 'bg-blue-600 text-white shadow' : 'theme-text-secondary hover:theme-bg-secondary'
                        }`}
                    >
                        <List size={18} />
                        リスト管理
                    </button>
                    <button
                        onClick={() => setView('results')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-md text-sm font-semibold transition-all ${
                            view === 'results' ? 'bg-blue-600 text-white shadow' : 'theme-text-secondary hover:theme-bg-secondary'
                        }`}
                    >
                        結果分析
                    </button>
                </div>
            </Card>
            
            {/* タブ下のタイトル */}
            <div className="text-center my-6">
                <h2 className="text-xl font-bold theme-text-primary">授業・ワークショップ管理</h2>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default AdminHub;
