import React, { useEffect, useState } from 'react';
import { db, appId, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs, writeBatch } from '../../lib/firebase';
import { Card, Button, IconButton, Item, Modal } from '../../components/ui';
import AddItemModal from '../../components/AddItemModal';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import type { ItemList, ItemData, NotificationType, Session } from '../../types';
import { getItemName } from '../../lib/utils';

interface Props {
  itemLists: ItemList[];
  setNotification: (n: NotificationType) => void;
}

const ItemListManager: React.FC<Props> = ({ itemLists, setNotification }) => {
    const [newListName, setNewListName] = useState<string>("");
    const [editingList, setEditingList] = useState<ItemList | null>(null);
    const [newItemText, setNewItemText] = useState<string>("");
    const [listToDelete, setListToDelete] = useState<ItemList | null>(null);
    const [sessionsUsingList, setSessionsUsingList] = useState<Session[]>([]);
    const [checkingUsage, setCheckingUsage] = useState<boolean>(false);
    const [replacementListId, setReplacementListId] = useState<string>("");
    const [isMigrating, setIsMigrating] = useState<boolean>(false);
    const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
    const [editingListName, setEditingListName] = useState<string>("");
    const [isSavingName, setIsSavingName] = useState<boolean>(false);
    
    // 編集開始時に現在の名称を入力欄へ反映
    useEffect(() => {
        if (editingList) {
            setEditingListName(editingList.name || "");
        } else {
            setEditingListName("");
        }
    }, [editingList]);
    
    const handleCreateList = async () => {
        const trimmedName = newListName.trim();
        if (!trimmedName) { setNotification({ type: 'error', message: 'リスト名を入力してください。' }); return; }
        await addDoc(collection(db, "artifacts", appId, "public", "data", "itemLists"), { name: trimmedName, items: [], createdAt: serverTimestamp() });
        setNotification({type: 'success', message: '新しいリストを作成しました。'});
        setNewListName("");
    };

    const confirmDeleteList = async () => {
        if (!listToDelete) return;
        // 使用中ブロック（安全のため）
        if (sessionsUsingList.length > 0) {
            setNotification({ type: 'error', message: `このリストは ${sessionsUsingList.length} 件のセッションで使用中のため削除できません。` });
            return;
        }
        await deleteDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", listToDelete.id));
        setNotification({type: 'success', message: `リスト「${listToDelete.name}」を削除しました。`});
        if (editingList?.id === listToDelete.id) setEditingList(null);
        setListToDelete(null); 
    };

    // 削除確認モーダルを開いたときに、そのリストを参照しているセッションを取得
    useEffect(() => {
        const checkUsage = async () => {
            if (!listToDelete) { setSessionsUsingList([]); return; }
            try {
                setCheckingUsage(true);
                const sessionsRef = collection(db, "artifacts", appId, "public", "data", "trainingSessions");
                const q = query(sessionsRef, where("itemListId", "==", listToDelete.id));
                const snap = await getDocs(q);
                const used: Session[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as Session));
                setSessionsUsingList(used);
            } catch (e) {
                console.error('Failed to check list usage', e);
                setSessionsUsingList([]);
            } finally {
                setCheckingUsage(false);
            }
        };
        checkUsage();
    }, [listToDelete]);

    const handleBulkReplace = async () => {
        if (!listToDelete) return;
        if (!replacementListId || replacementListId === listToDelete.id) {
            setNotification({ type: 'error', message: '置換先のリストを選択してください。' });
            return;
        }
        if (sessionsUsingList.length === 0) return;
        try {
            setIsMigrating(true);
            // Firestore は 1 バッチ 500 書き込みまで。チャンクに分割して処理。
            const chunkSize = 450;
            for (let i = 0; i < sessionsUsingList.length; i += chunkSize) {
                const chunk = sessionsUsingList.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach((s) => {
                    const sRef = doc(db, "artifacts", appId, "public", "data", "trainingSessions", s.id);
                    batch.update(sRef, { itemListId: replacementListId });
                });
                await batch.commit();
            }
            setNotification({ type: 'success', message: `${sessionsUsingList.length} 件のセッションを置換しました。` });
            // 置換完了後に再チェック
            const sessionsRef = collection(db, "artifacts", appId, "public", "data", "trainingSessions");
            const q = query(sessionsRef, where("itemListId", "==", listToDelete.id));
            const snap = await getDocs(q);
            const used: Session[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as Session));
            setSessionsUsingList(used);
        } catch (e) {
            console.error('Bulk replace failed', e);
            setNotification({ type: 'error', message: '一括置換に失敗しました。ネットワーク状態をご確認ください。' });
        } finally {
            setIsMigrating(false);
        }
    };

    // 新しいアイテム（オブジェクト形式）を追加
    const handleAddNewItem = async (itemData: ItemData) => {
        if (!editingList) return;
        
        const existingNames = editingList.items.map(item => getItemName(item));
        if (existingNames.includes(itemData.name)) {
            setNotification({type: 'error', message: '同じ名前のアイテムが既に存在します。'});
            return;
        }
        
        const newList: ItemList = { ...editingList, items: [...editingList.items, itemData] };
        await updateDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", editingList.id), { items: newList.items });
        setEditingList(newList);
        setNotification({type: 'success', message: 'アイテムを追加しました。'});
    };

    // 旧形式のアイテム（文字列）を追加（後方互換性）
    const handleAddItem = async () => {
        const trimmedItem = newItemText.trim();
        if (!trimmedItem || !editingList) return;
        
        const existingNames = editingList.items.map(item => getItemName(item));
        if (existingNames.includes(trimmedItem)) {
            setNotification({type: 'error', message: '同じ名前のアイテムが既に存在します。'});
            return;
        }
        
        const newList: ItemList = { ...editingList, items: [...editingList.items, trimmedItem] };
        await updateDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", editingList.id), { items: newList.items });
        setEditingList(newList); setNewItemText("");
    };

    const handleRemoveItem = async (itemToRemove: string | ItemData) => {
        if (!editingList) return;
        const itemName = getItemName(itemToRemove);
        const newList: ItemList = { 
            ...editingList, 
            items: editingList.items.filter((item) => getItemName(item) !== itemName) 
        };
        await updateDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", editingList.id), { items: newList.items });
        setEditingList(newList);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center theme-text-primary">アイテムリスト管理</h2>
            <Card>
                <div className="flex flex-col sm:flex-row items-stretch justify-center gap-2">
                    <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="新しいリスト名 (例: 水害対策セット)" className="flex-grow p-2 rounded-lg theme-bg-input theme-text-primary theme-border" />
                    <Button onClick={handleCreateList} icon={PlusCircle}>リスト作成</Button>
                </div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {itemLists.map((list: ItemList) => (
                    <Card key={list.id}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xl font-bold theme-text-primary">{list.name} {list.isDefault && "(基本)"}</h3>
                            <div className="flex items-center gap-2">
                                <Button onClick={() => setEditingList(list)} className="bg-green-600 hover:bg-green-700 text-sm py-1 px-3" icon={Edit}>編集</Button>
                                {!list.isDefault && <IconButton onClick={() => setListToDelete(list)} className="theme-delete-icon" title="リストを削除"><Trash2 size={20} /></IconButton>}
                            </div>
                        </div>
                        <p className="theme-text-secondary">{list.items.length} 個のアイテム</p>
                    </Card>
                ))}
            </div>
            <Modal isOpen={!!editingList} onClose={() => setEditingList(null)} title={`リスト編集: ${editingList?.name}`}>
                 <div className="space-y-4">
                    {/* 名称変更 */}
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                        <input 
                            type="text" 
                            value={editingListName}
                            onChange={(e) => setEditingListName(e.target.value)}
                            placeholder="リスト名を編集"
                            className="flex-grow p-2 rounded-lg theme-bg-input theme-text-primary theme-border"
                        />
                        <Button 
                            onClick={async () => {
                                if (!editingList) return;
                                const name = editingListName.trim();
                                if (!name) { setNotification({ type: 'error', message: 'リスト名を入力してください。' }); return; }
                                // 重複チェック
                                const dup = itemLists.some(l => l.name === name && l.id !== editingList.id);
                                if (dup) { setNotification({ type: 'error', message: '同じ名前のリストが既に存在します。別の名前にしてください。' }); return; }
                                try {
                                    setIsSavingName(true);
                                    await updateDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", editingList.id), { name });
                                    setEditingList({ ...editingList, name });
                                    setNotification({ type: 'success', message: 'リスト名を更新しました。' });
                                } catch (e) {
                                    console.error('Failed to rename list', e);
                                    setNotification({ type: 'error', message: 'リスト名の更新に失敗しました。' });
                                } finally {
                                    setIsSavingName(false);
                                }
                            }}
                            disabled={!editingListName.trim() || isSavingName}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSavingName ? '保存中...' : '名称を保存'}
                        </Button>
                    </div>
                    <p className="text-xs theme-text-secondary">ヒント: 画面を開いた直後は現在のリスト名を入力してください。</p>
                    <div className="flex gap-2 mb-4">
                        <Button 
                            onClick={() => setShowAddItemModal(true)} 
                            className="bg-green-600 hover:bg-green-700" 
                            icon={PlusCircle}
                        >
                            新しいアイテム追加
                        </Button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 p-2 bg-gray-50 rounded">
                        <input 
                            type="text" 
                            value={newItemText} 
                            onChange={(e) => setNewItemText(e.target.value)} 
                            placeholder="シンプルなアイテム名（テキストのみ）" 
                            className="flex-grow p-2 rounded-lg theme-bg-input theme-text-primary theme-border" 
                        />
                        <Button 
                            onClick={handleAddItem} 
                            disabled={!newItemText.trim()} 
                            className="bg-blue-600 hover:bg-blue-700 text-sm"
                        >
                            簡単追加
                        </Button>
                    </div>
                    
                    <div className="p-4 theme-bg-secondary rounded-lg min-h-[200px]">
                        <h4 className="font-bold mb-2 theme-text-primary">現在のアイテム ({editingList?.items.length}個):</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {editingList?.items.map((item, index: number) => (
                                <Item 
                                    key={`${getItemName(item)}-${index}`} 
                                    item={item} 
                                    isEditable={true} 
                                    onDelete={() => handleRemoveItem(item)} 
                                    isSelected={false} 
                                    onClick={() => {}} 
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
            
            {/* 新しいアイテム追加モーダル */}
            <AddItemModal
                isOpen={showAddItemModal}
                onClose={() => setShowAddItemModal(false)}
                onAdd={handleAddNewItem}
                existingItems={editingList?.items || []}
            />
            
            <Modal isOpen={!!listToDelete} onClose={() => setListToDelete(null)} title="リストの削除の確認" maxWidth="max-w-lg">
                <div className="space-y-4">
                    <p className="theme-text-primary">リスト <span className="font-bold text-red-600">{listToDelete?.name}</span> を本当に削除しますか？</p>
                    <p className="text-sm theme-text-secondary">この操作は元に戻せません。</p>
                    {checkingUsage ? (
                        <p className="text-sm theme-text-secondary">使用状況を確認中...</p>
                    ) : sessionsUsingList.length > 0 ? (
                        <div className="p-3 rounded theme-bg-secondary space-y-3">
                            <p className="text-sm text-red-600 font-semibold">このリストは以下のセッションで使用中のため削除できません:</p>
                            <ul className="list-disc list-inside text-sm theme-text-primary">
                                {sessionsUsingList.map((s) => (
                                    <li key={s.id}>{s.name || '(名称未設定)'} <span className="theme-text-secondary">(ID: {s.id})</span></li>
                                ))}
                            </ul>
                            <div className="pt-2 border-t border-gray-300/30 dark:border-gray-600/30">
                                <p className="text-sm theme-text-secondary mb-2">他のアイテムリストへ一括置換してから削除できます。</p>
                                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                    <select
                                        value={replacementListId}
                                        onChange={(e) => setReplacementListId(e.target.value)}
                                        className="px-2 py-2 rounded theme-bg-input theme-text-primary theme-border"
                                        aria-label="置換先のリストを選択"
                                    >
                                        <option value="">置換先のリストを選択</option>
                                        {itemLists
                                            .filter(l => l.id !== listToDelete?.id)
                                            .map((l) => (
                                                <option key={l.id} value={l.id}>{l.name}{l.isDefault ? '（基本）' : ''}</option>
                                            ))}
                                    </select>
                                    <Button 
                                        onClick={handleBulkReplace} 
                                        disabled={!replacementListId || isMigrating}
                                        className="bg-blue-600 hover:bg-blue-700 text-sm"
                                    >
                                        {isMigrating ? '置換中...' : 'セッションを一括置換'}
                                    </Button>
                                </div>
                                {itemLists.filter(l => l.id !== listToDelete?.id).length === 0 && (
                                    <p className="text-xs mt-1 text-yellow-600">置換先のリストがありません。新しいリストを作成してください。</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm theme-text-secondary">このリストを使用しているセッションは見つかりませんでした。</p>
                    )}
                    <div className="flex justify-end gap-4 pt-4">
                        <Button onClick={() => setListToDelete(null)} className="theme-button-secondary">キャンセル</Button>
                        <Button onClick={confirmDeleteList} disabled={sessionsUsingList.length > 0 || checkingUsage || isMigrating} className={`bg-red-600 hover:bg-red-700 ${sessionsUsingList.length > 0 || checkingUsage || isMigrating ? 'opacity-60 cursor-not-allowed' : ''}`}>削除する</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ItemListManager;
