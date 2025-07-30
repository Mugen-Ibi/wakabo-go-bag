import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { Card, Button, IconButton, Item, Modal } from '../../components/ui';
import AddItemModal from '../../components/AddItemModal';
import { PlusCircle, Trash2, Edit, XCircle } from 'lucide-react';
import type { ItemList, ItemData, NotificationType } from '../../types';
import { getItemName, normalizeItem } from '../../lib/itemUtils';

interface Props {
  itemLists: ItemList[];
  setNotification: (n: NotificationType) => void;
}

const ItemListManager: React.FC<Props> = ({ itemLists, setNotification }) => {
    const [newListName, setNewListName] = useState<string>("");
    const [editingList, setEditingList] = useState<ItemList | null>(null);
    const [newItemText, setNewItemText] = useState<string>("");
    const [listToDelete, setListToDelete] = useState<ItemList | null>(null);
    const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
    
    const handleCreateList = async () => {
        const trimmedName = newListName.trim();
        if (!trimmedName) { setNotification({ type: 'error', message: 'リスト名を入力してください。' }); return; }
        await addDoc(collection(db, "artifacts", appId, "public", "data", "itemLists"), { name: trimmedName, items: [], createdAt: serverTimestamp() });
        setNotification({type: 'success', message: '新しいリストを作成しました。'});
        setNewListName("");
    };

    const confirmDeleteList = async () => {
        if (!listToDelete) return;
        await deleteDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", listToDelete.id));
        setNotification({type: 'success', message: `リスト「${listToDelete.name}」を削除しました。`});
        if (editingList?.id === listToDelete.id) setEditingList(null);
        setListToDelete(null); 
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
                    <Button onClick={handleCreateList} icon={PlusCircle as any}>リスト作成</Button>
                </div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {itemLists.map((list: ItemList) => (
                    <Card key={list.id}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xl font-bold theme-text-primary">{list.name} {list.isDefault && "(基本)"}</h3>
                            <div className="flex items-center gap-2">
                                <Button onClick={() => setEditingList(list)} className="bg-green-600 hover:bg-green-700 text-sm py-1 px-3" icon={Edit as any}>編集</Button>
                                {!list.isDefault && <IconButton onClick={() => setListToDelete(list)} className="theme-delete-icon" title="リストを削除"><Trash2 size={20} /></IconButton>}
                            </div>
                        </div>
                        <p className="theme-text-secondary">{list.items.length} 個のアイテム</p>
                    </Card>
                ))}
            </div>
            <Modal isOpen={!!editingList} onClose={() => setEditingList(null)} title={`リスト編集: ${editingList?.name}`}>
                 <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                        <Button 
                            onClick={() => setShowAddItemModal(true)} 
                            className="bg-green-600 hover:bg-green-700" 
                            icon={PlusCircle as any}
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
                    <p className="text-sm theme-text-secondary">この操作は元に戻せません。このリストを使用しているセッションがある場合、正常に動作しなくなる可能性があります。</p>
                    <div className="flex justify-end gap-4 pt-4">
                        <Button onClick={() => setListToDelete(null)} className="theme-button-secondary">キャンセル</Button>
                        <Button onClick={confirmDeleteList} className="bg-red-600 hover:bg-red-700">削除する</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ItemListManager;
