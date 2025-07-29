import React, { useState } from 'react';
import { collection, query, where, getDocs, getDoc, collectionGroup, doc } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { Card, Button } from '../../components/ui';
import { LogIn } from 'lucide-react';
import type { Session, ItemList, SessionInfo } from '../../types';

type Team = { id: string; [key: string]: any };

interface Props {
  onJoin: (info: SessionInfo) => void;
}

const JoinSession: React.FC<Props> = ({ onJoin }) => {
    const [accessCode, setAccessCode] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const handleJoin = async () => {
        if (accessCode.length !== 4) { setError("4桁の参加コードを入力してください。"); return; }
        setIsLoading(true); setError("");
        try {
            const wsQuery = query(collection(db, "artifacts", appId, "public", "data", "trainingSessions"), where("accessCode", "==", accessCode));
            const wsSnapshot = await getDocs(wsQuery);
            if (!wsSnapshot.empty) {
                const sessionDoc = wsSnapshot.docs[0];
                const itemListDocSnap = await getDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", sessionDoc.data().itemListId));
                const sessionData = sessionDoc.data() as Session;
                const itemList = { id: itemListDocSnap.id, ...itemListDocSnap.data() };
                onJoin({ 
                    type: 'workshop', 
                    sessionId: sessionData.id || sessionDoc.id,
                    itemList: itemList as ItemList,
                    sessionName: sessionData.name || ''
                });
                return;
            }
            const teamQuery = query(collectionGroup(db, 'teams'), where("accessCode", "==", accessCode));
            const teamSnapshot = await getDocs(teamQuery);
            if (!teamSnapshot.empty) {
                const teamDoc = teamSnapshot.docs[0];
                const sessionDocRef = teamDoc.ref.parent.parent;
                if (!sessionDocRef) { setError("セッション情報が取得できませんでした。"); setIsLoading(false); return; }
                const sessionDocSnap = await getDoc(sessionDocRef);
                if (!sessionDocSnap.exists()) { setError("セッション情報が取得できませんでした。"); setIsLoading(false); return; }
                const itemListDocSnap = await getDoc(doc(db, "artifacts", appId, "public", "data", "itemLists", sessionDocSnap.data().itemListId));
                const sessionData = sessionDocSnap.data() as Session;
                const teamData = teamDoc.data() as Team;
                const itemList = { id: itemListDocSnap.id, ...itemListDocSnap.data() };
                onJoin({ 
                    type: 'lesson', 
                    sessionId: sessionDocSnap.id,
                    teamNumber: teamData.teamNumber,
                    itemList: itemList as ItemList,
                    sessionName: sessionData.name || ''
                });
                return;
            }
            setError("有効な参加コードではありません。");
        } catch (e) {
            console.error(e);
            setError("セッションの検索中にエラーが発生しました。");
        }
        setIsLoading(false);
    };

    return ( <Card><h2 className="text-2xl font-bold mb-4 text-center theme-text-primary">セッションに参加</h2><div className="flex flex-col items-center gap-4"><input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="4桁の参加コード" maxLength={4} className="p-3 rounded-lg text-2xl text-center font-mono tracking-widest w-48 theme-bg-input theme-text-primary theme-border"/>{error && <p className="text-red-500 text-sm">{error}</p>}<Button onClick={handleJoin} disabled={isLoading} icon={LogIn as any}>{isLoading ? "参加中..." : "参加する"}</Button></div></Card> );
};

export default JoinSession;
