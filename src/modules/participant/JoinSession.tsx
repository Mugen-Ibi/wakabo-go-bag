import React, { useState } from 'react';
import { collection, query, where, getDocs, getDoc, collectionGroup, doc } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { Card, Button } from '../../components/ui';
import { LogIn } from 'lucide-react';
import type { Session, ItemList } from '../../types';

type Team = { id: string; [key: string]: any };

interface Props { onJoin: (info: any) => void; }

const JoinSession: React.FC<Props> = ({ onJoin }) => {
    const [accessCode, setAccessCode] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    // 全角数字→半角、数字以外除去、trim
    const normalizeCode = (input: string) => {
        const zenkakuToHankaku = input.replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30));
        return zenkakuToHankaku.replace(/[^0-9]/g, '').trim();
    };

    const handleJoin = async () => {
        const code = normalizeCode(accessCode);
        if (code.length !== 4) { setError("4桁の数字コードを入力してください。"); return; }
        setIsLoading(true); setError("");
        try {
            // 1) workshop: セッション自体に accessCode がある
            const wsQuery = query(
                collection(db, "artifacts", appId, "public", "data", "trainingSessions"),
                where("accessCode", "==", code)
            );
            const wsSnapshot = await getDocs(wsQuery);
            if (!wsSnapshot.empty) {
                const sessionDoc = wsSnapshot.docs[0];
                const sData = sessionDoc.data() as Session;
                const itemListId = (sData as any).itemListId;
                if (!itemListId) { setError("このセッションのアイテムリストが見つかりませんでした（設定不足）。管理者にお問い合わせください。"); return; }
                const itemListDocSnap = await getDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", itemListId));
                if (!itemListDocSnap.exists()) { setError("アイテムリストが削除されている可能性があります。管理者にお問い合わせください。"); return; }
                const itemList = { id: itemListDocSnap.id, ...itemListDocSnap.data() };
                onJoin({
                    type: 'workshop',
                    session: { id: sData.id || sessionDoc.id, name: sData.name || '' },
                    itemList: itemList as ItemList,
                });
                return;
            }

            // 2) lesson: teams の accessCode を検索
            const teamQuery = query(collectionGroup(db, 'teams'), where("accessCode", "==", code));
            const teamSnapshot = await getDocs(teamQuery);
            if (!teamSnapshot.empty) {
                const teamDoc = teamSnapshot.docs[0];
                const teamData = teamDoc.data() as Team;
                const sessionDocRef = teamDoc.ref.parent.parent;
                if (!sessionDocRef) { setError("セッション情報が取得できませんでした。"); return; }
                const sessionDocSnap = await getDoc(sessionDocRef);
                if (!sessionDocSnap.exists()) { setError("セッション情報が取得できませんでした。"); return; }
                const sData = sessionDocSnap.data() as Session;
                const itemListId = (sData as any).itemListId;
                if (!itemListId) { setError("このセッションのアイテムリストが見つかりませんでした（設定不足）。管理者にお問い合わせください。"); return; }
                const itemListDocSnap = await getDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", itemListId));
                if (!itemListDocSnap.exists()) { setError("アイテムリストが削除されている可能性があります。管理者にお問い合わせください。"); return; }
                const itemList = { id: itemListDocSnap.id, ...itemListDocSnap.data() };
                onJoin({
                    type: 'lesson',
                    session: { id: sessionDocSnap.id, name: sData.name || '' },
                    team: {
                        id: teamDoc.id,
                        teamNumber: teamData.teamNumber,
                        selectedItems: teamData.selectedItems || [],
                        isSubmitted: teamData.isSubmitted || false,
                    },
                    itemList: itemList as ItemList,
                });
                return;
            }
            setError("有効な参加コードではありません。");
        } catch (e) {
            console.error(e);
            setError("セッションの検索中にエラーが発生しました。ネットワーク状態やコードを確認してください。");
        } finally {
            setIsLoading(false);
        }
    };

    return ( <Card><h2 className="text-2xl font-bold mb-4 text-center theme-text-primary">セッションに参加</h2><div className="flex flex-col items-center gap-4"><input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="4桁の参加コード" maxLength={8} className="p-3 rounded-lg text-2xl text-center font-mono tracking-widest w-48 theme-bg-input theme-text-primary theme-border"/>{error && <p className="text-red-500 text-sm">{error}</p>}<Button onClick={handleJoin} disabled={isLoading} icon={LogIn as any}>{isLoading ? "参加中..." : "参加する"}</Button></div></Card> );
};

export default JoinSession;
