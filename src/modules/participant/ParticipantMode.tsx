import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, updateDoc, addDoc, serverTimestamp, collection } from 'firebase/firestore';
import { auth, db, appId } from '../../lib/firebase';
import { Card, Button, Item } from '../../components/ui';
import { MAX_SELECTION } from '../../lib/helpers';
import { getItemName } from '../../lib/itemUtils';
import type { NotificationType, ItemData } from '../../types';

type InfoType = {
  type: 'lesson' | 'workshop';
  team?: { selectedItems?: string[]; isSubmitted?: boolean; teamNumber?: number; id?: string };
  session: { id: string; [key: string]: any };
  itemList: { name: string; items: (string | ItemData)[] };
};

interface Props {
    info: InfoType;
    setNotification: (n: NotificationType) => void;
    onSubmitted?: (selected: string[]) => void;
}

const ParticipantMode: React.FC<Props> = ({ info, setNotification, onSubmitted }) => {
    const [selectedItems, setSelectedItems] = useState<string[]>(info.type === 'lesson' ? info.team?.selectedItems || [] : []);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(info.type === 'lesson' ? info.team?.isSubmitted ?? false : false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => { onAuthStateChanged(auth, (user) => { if(user) setUserId(user.uid ?? null); }); }, []);

    const handleSubmit = async () => {
        if (selectedItems.length === 0) { setNotification({type: 'error', message: "アイテムを1つ以上選択してください。"}); return; }
        setIsSubmitting(true);

        if(info.type === 'lesson' && info.team && info.team.id) {
            const teamDocRef = doc(db, "artifacts", appId, "public", "data", "trainingSessions", info.session.id, "teams", info.team.id);
            await updateDoc(teamDocRef, { selectedItems, isSubmitted: true, submittedAt: serverTimestamp() });
        } else {
            const collectionPath = collection(db, "artifacts", appId, "public", "data", "trainingSessions", info.session.id, "participants");
            await addDoc(collectionPath, { userId, selectedItems, isSubmitted: true, submittedAt: serverTimestamp() });
        }
        
    setIsSubmitted(true);
    setNotification({type: 'success', message: "回答を提出しました。お疲れ様でした！"});
    setIsSubmitting(false);
    // 結果ボードへ遷移（親に委譲）
    onSubmitted?.(selectedItems);
    };

    const handleItemClick = async (item: string | ItemData) => {
        if (isSubmitted) return;
        const itemName = getItemName(item);
        const newSelectedItems = selectedItems.includes(itemName) 
            ? selectedItems.filter((i: string) => i !== itemName) 
            : [...selectedItems, itemName];
        if (newSelectedItems.length > MAX_SELECTION) { setNotification({type: 'error', message: `選択できるアイテムは${MAX_SELECTION}個までです。`}); return; }
        setSelectedItems(newSelectedItems);
        
        if (info.type === 'lesson' && info.team && info.team.id) {
            const teamDocRef = doc(db, "artifacts", appId, "public", "data", "trainingSessions", info.session.id, "teams", info.team.id);
            await updateDoc(teamDocRef, { selectedItems: newSelectedItems });
        }
    };

    if (isSubmitted) {
        return <Card><div className="text-center p-8"><h2 className="text-2xl font-bold text-green-600">提出完了！</h2><p className="mt-2 theme-text-secondary">ご協力ありがとうございました。</p></div></Card>;
    }

    const title = info.type === 'lesson' && info.team && info.team.teamNumber !== undefined ? `チーム ${info.team.teamNumber}` : info.session.name;

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl sm:text-2xl font-bold theme-text-primary">{title}</h2><div className="text-lg font-bold text-right theme-text-primary"><span className={selectedItems.length > MAX_SELECTION ? 'text-red-500' : ''}>{selectedItems.length}</span> / {MAX_SELECTION} 個</div></div>
                <p className="theme-text-secondary">アイテムリスト: <span className="font-bold">{info.itemList.name}</span></p>
            </Card>
            <Card><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">{info.itemList.items.map((item, index: number) => {
                const itemName = getItemName(item);
                return (
                    <Item 
                        key={itemName + index} 
                        item={item} 
                        isSelected={selectedItems.includes(itemName)} 
                        onClick={() => handleItemClick(item)} 
                        onDelete={() => {}} 
                    />
                );
            })}</div></Card>
            <div className="text-center mt-6"><Button onClick={handleSubmit} disabled={selectedItems.length === 0 || isSubmitting} className="bg-green-600 hover:bg-green-700">{isSubmitting ? "提出中..." : "この内容で提出する"}</Button></div>
        </div>
    );
};

export default ParticipantMode;
