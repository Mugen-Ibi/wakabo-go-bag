import React, { useState } from 'react';
import { appId, addDoc, updateDoc, deleteDoc, doc, collection, serverTimestamp } from '../../lib/firebase';
import { Card, Button, IconButton, Modal } from '../../components/ui';
import { Item } from '../../components/ui/item';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import type { ItemList, ItemData, NotificationType } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { getItemName } from '../../lib/utils';

interface ItemListManagerProps {
    itemLists: ItemList[];
    setNotification: (n: NotificationType) => void;
}

const ItemListManager: React.FC<ItemListManagerProps> = ({ itemLists, setNotification }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingList, setEditingList] = useState<ItemList | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [newItemCategory, setNewItemCategory] = useState("その他");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 新しいリスト作成の開始
    const startCreateList = () => {
        setEditingList({
            id: "",
            name: "",
            items: [],
            createdAt: null,
            updatedAt: null
        });
        setIsEditing(true);
    };

    // リスト編集の開始
    const startEditList = (list: ItemList) => {
        setEditingList({ ...list });
        setIsEditing(true);
    };

    // リストの保存
    const saveList = async () => {
        if (!editingList || !editingList.name) {
            setNotification({ type: 'error', message: 'リスト名を入力してください' });
            return;
        }

        if (editingList.items.length === 0) {
            setNotification({ type: 'error', message: '少なくとも1つのアイテムを追加してください' });
            return;
        }

        setIsSubmitting(true);
        try {
            const { db } = await import('../../lib/firebase');
            if (!db) return;

            const listData = {
                name: editingList.name,
                items: editingList.items,
                updatedAt: serverTimestamp()
            };

            if (editingList.id) {
                // 更新
                await updateDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", editingList.id), listData);
                setNotification({ type: 'success', message: 'リストを更新しました' });
            } else {
                // 新規作成
                await addDoc(collection(db, "artifacts", appId, "public", "data", "itemLists"), {
                    ...listData,
                    createdAt: serverTimestamp(),
                    isDefault: false
                });
                setNotification({ type: 'success', message: '新しいリストを作成しました' });
            }
            setIsEditing(false);
            setEditingList(null);
        } catch (error) {
            console.error('Error saving list:', error);
            setNotification({ type: 'error', message: 'リストの保存中にエラーが発生しました' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // リストの削除
    const deleteList = async (listId: string) => {
        if (!confirm('このリストを削除しますか？この操作は取り消せません。')) return;

        try {
            const { db } = await import('../../lib/firebase');
            if (!db) return;

            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", listId));
            setNotification({ type: 'success', message: 'リストを削除しました' });
        } catch (error) {
            console.error('Error deleting list:', error);
            setNotification({ type: 'error', message: 'リストの削除中にエラーが発生しました' });
        }
    };

    // アイテムの追加（編集モード内）
    const addItem = () => {
        if (!newItemName || !editingList) return;

        const newItem: ItemData = {
            id: uuidv4(),
            name: newItemName,
            category: newItemCategory
        };

        setEditingList({
            ...editingList,
            items: [...editingList.items, newItem]
        });

        setNewItemName("");
        setNewItemCategory("その他");
    };

    // アイテムの削除（編集モード内）
    const removeItem = (target: string | ItemData) => {
        if (!editingList) return;
        setEditingList({
            ...editingList,
            items: editingList.items.filter(item => {
                if (typeof target === 'string') {
                    return item !== target;
                }
                if (typeof item === 'string') {
                    return item !== target.name;
                }
                return item.id !== target.id;
            })
        });
    };

    const categories = ['食料・水', '衛生用品', '救急・安全', '生活用品', '貴重品', 'その他'];

    return (
        <div className="space-y-8 mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">アイテムリスト管理</h2>
                    <p className="text-muted-foreground mt-1">セッションで使用する持ち出し品リストを管理します</p>
                </div>
                <Button onClick={startCreateList} size="lg" className="shadow-md hover:shadow-lg transition-all">
                    <Plus size={20} className="mr-2" />
                    新しいリストを作成
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {itemLists.map((list) => (
                    <Card key={list.id} className="flex flex-col h-full hover:border-primary/30 transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                                    {list.name}
                                    {list.isDefault && (
                                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 px-2.5 py-0.5 rounded-full font-medium border border-blue-200 dark:border-blue-800">
                                            基本
                                        </span>
                                    )}
                                </h3>
                                <p className="text-muted-foreground text-sm mt-1.5 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary/50"></span>
                                    {list.items.length}個のアイテム
                                </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!list.isDefault && (
                                    <>
                                        <IconButton onClick={() => startEditList(list)} title="編集" className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                            <Edit2 size={18} />
                                        </IconButton>
                                        <IconButton onClick={() => deleteList(list.id)} title="削除" className="text-destructive hover:bg-destructive/10">
                                            <Trash2 size={18} />
                                        </IconButton>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 bg-secondary/20 rounded-xl p-4 overflow-y-auto max-h-[300px] custom-scrollbar border border-border/50">
                            <div className="flex flex-wrap gap-2">
                                {list.items.map((item, index) => {
                                    const itemName = getItemName(item);
                                    const itemId = typeof item === 'string' ? item : item.id || itemName + index;
                                    return (
                                        <span key={itemId} className="bg-background/80 backdrop-blur-sm border border-border/60 px-2.5 py-1.5 rounded-lg text-sm text-foreground shadow-sm">
                                            {itemName}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* 編集モーダル */}
            <Modal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                title={editingList?.id ? "リストを編集" : "新しいリストを作成"}
                className="max-w-4xl"
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-foreground mb-2">
                                リスト名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editingList?.name || ""}
                                onChange={(e) => setEditingList(prev => prev ? { ...prev, name: e.target.value } : null)}
                                placeholder="例: 学校用防災セット"
                                className="w-full px-4 py-2.5 bg-input/50 border border-input text-foreground rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-semibold text-foreground">
                                アイテムを追加
                            </label>
                            <span className="text-xs text-muted-foreground">
                                合計: {editingList?.items.length || 0}個
                            </span>
                        </div>

                        <div className="flex gap-3 p-4 bg-secondary/20 rounded-xl border border-border/50">
                            <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="アイテム名を入力..."
                                className="flex-1 px-4 py-2.5 bg-background border border-input text-foreground rounded-lg focus:ring-2 focus:ring-primary/20 transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                            />
                            <select
                                value={newItemCategory}
                                onChange={(e) => setNewItemCategory(e.target.value)}
                                className="w-40 px-4 py-2.5 bg-background border border-input text-foreground rounded-lg focus:ring-2 focus:ring-primary/20 transition-all"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <Button onClick={addItem} disabled={!newItemName} variant="secondary" className="shrink-0">
                                <Plus size={20} />
                                <span className="ml-2 hidden sm:inline">追加</span>
                            </Button>
                        </div>
                    </div>

                    <div className="border-t border-border/50 pt-6">
                        <h4 className="text-sm font-semibold text-foreground mb-4">
                            登録済みアイテム
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {editingList?.items.map((item, index) => {
                                const itemName = getItemName(item);
                                const itemId = typeof item === 'string' ? item : item.id || itemName + index;
                                return (
                                    <Item
                                        key={itemId}
                                        item={item}
                                        isSelected={false}
                                        isEditable={true}
                                        onDelete={() => removeItem(item)}
                                        onClick={() => { }}
                                    />
                                );
                            })}
                        </div>
                        {editingList?.items.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-secondary/10 rounded-xl border-2 border-dashed border-border/50">
                                <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mb-3">
                                    <Plus size={24} className="opacity-50" />
                                </div>
                                <p>アイテムがありません</p>
                                <p className="text-sm mt-1 opacity-70">上のフォームからアイテムを追加してください</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
                        <Button variant="ghost" onClick={() => setIsEditing(false)} className="hover:bg-secondary/50">
                            キャンセル
                        </Button>
                        <Button onClick={saveList} disabled={isSubmitting} className="min-w-[120px] shadow-md">
                            {isSubmitting ? '保存中...' : '保存する'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ItemListManager;
