import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { Card, Button, IconButton } from '../../components/ui';
import { Plus, Play, Users, Trash2, Copy, RotateCcw } from 'lucide-react';
import type { Session, ItemList, NotificationType } from '../../types';

interface SessionManagerProps {
  itemLists: ItemList[];
  onViewResults: (session: Session) => void;
  setNotification: (n: NotificationType) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ itemLists, onViewResults, setNotification }) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [newSessionName, setNewSessionName] = useState<string>("");
    const [newSessionType, setNewSessionType] = useState<'lesson' | 'workshop'>('lesson');
    const [selectedItemListId, setSelectedItemListId] = useState<string>("");
    const [teamCount, setTeamCount] = useState<number>(2);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        const sessionsQuery = query(collection(db, "artifacts", appId, "public", "data", "trainingSessions"));
        const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
            const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
            setSessions(sessionsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        });
        return () => unsubscribe();
    }, []);

    const generateAccessCode = (): string => Math.floor(1000 + Math.random() * 9000).toString();

    const createSession = async () => {
        if (!newSessionName || !selectedItemListId) { setNotification({ type: 'error', message: '必要な項目を入力してください。' }); return; }
        setIsSubmitting(true);
        try {
            const sessionDoc = await addDoc(collection(db, "artifacts", appId, "public", "data", "trainingSessions"), {
                name: newSessionName,
                type: newSessionType,
                itemListId: selectedItemListId,
                accessCode: generateAccessCode(),
                createdAt: serverTimestamp(),
                isActive: false
            });
            
            if (newSessionType === 'lesson') {
                for (let i = 1; i <= teamCount; i++) {
                    await addDoc(collection(db, "artifacts", appId, "public", "data", "trainingSessions", sessionDoc.id, "teams"), {
                        teamNumber: i,
                        accessCode: generateAccessCode(),
                        selectedItems: [],
                        isSubmitted: false,
                        createdAt: serverTimestamp()
                    });
                }
            }
            
            setNotification({ type: 'success', message: 'セッションを作成しました。' });
            setNewSessionName("");
            setSelectedItemListId("");
            setTeamCount(2);
        } catch (error) {
            console.error('Error creating session:', error);
            setNotification({ type: 'error', message: 'セッション作成中にエラーが発生しました。' });
        }
        setIsSubmitting(false);
    };

    const deleteSession = async (sessionId: string) => {
        if (!confirm('このセッションを削除しますか？この操作は取り消せません。')) return;
        try {
            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "trainingSessions", sessionId));
            setNotification({ type: 'success', message: 'セッションを削除しました。' });
        } catch (error) {
            console.error('Error deleting session:', error);
            setNotification({ type: 'error', message: 'セッション削除中にエラーが発生しました。' });
        }
    };

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
            {/* セッション作成フォーム */}
            <Card>
                <div className="space-y-4">
                    {/* セッション名入力 */}
                    <div>
                        <label className="block text-sm font-medium theme-text-primary mb-2">セッション名</label>
                        <input 
                            type="text" 
                            value={newSessionName} 
                            onChange={(e) => setNewSessionName(e.target.value)} 
                            className="w-full p-3 rounded-lg theme-bg-input theme-text-primary border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="例: 1組 防災訓練"
                        />
                    </div>

                    {/* セッションタイプ選択ボタン */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => setNewSessionType('lesson')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                                newSessionType === 'lesson'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 theme-text-primary hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            授業（チーム制）
                        </button>
                        <button
                            onClick={() => setNewSessionType('workshop')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                                newSessionType === 'workshop'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 theme-text-primary hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            ワークショップ（個人参加）
                        </button>
                    </div>

                    {/* チーム数（授業モード時のみ） */}
                    {newSessionType === 'lesson' && (
                        <div>
                            <label className="block text-sm font-medium theme-text-primary mb-2">チーム数</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="50" 
                                value={teamCount} 
                                onChange={(e) => setTeamCount(parseInt(e.target.value) || 2)} 
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
                            value={selectedItemListId} 
                            onChange={(e) => setSelectedItemListId(e.target.value)} 
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
                        disabled={isSubmitting || !newSessionName} 
                        className="w-full py-3 text-lg bg-slate-700 hover:bg-slate-600 text-white"
                        icon={Plus}
                    >
                        {isSubmitting ? 'セッション作成中...' : 'セッション作成'}
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
                    {sessions.length === 0 ? (
                        <div className="text-center py-8 theme-text-secondary">
                            まだセッションがありません。上記のフォームから新しいセッションを作成してください。
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map((session) => (
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