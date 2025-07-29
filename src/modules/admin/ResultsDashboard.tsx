import React, { useState, useEffect, useMemo } from 'react';
import styles from './ResultsDashboard.module.css';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { Card } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Session, TeamResult, SessionStats } from '../../types';

type TeamOrParticipant = {
  id: string;
  teamNumber?: number;
  isSubmitted?: boolean;
  selectedItems?: string[];
};

interface Props {
  session: Session;
  onBack?: () => void;
}

const ResultsDashboard: React.FC<Props> = ({ session, onBack }) => {
    const [results, setResults] = useState<TeamOrParticipant[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        let q;
        if (session.type === 'lesson') {
            q = query(collection(db, "artifacts", appId, "public", "data", "trainingSessions", session.id, "teams"));
        } else {
            q = query(collection(db, "artifacts", appId, "public", "data", "trainingSessions", session.id, "participants"));
        }
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setResults(snapshot.docs.map(d => {
                const data = d.data();
                return {
                  id: d.id,
                  teamNumber: data.teamNumber,
                  isSubmitted: data.isSubmitted,
                  selectedItems: data.selectedItems ?? []
                };
            }));
            setIsLoading(false);
        });
        return unsubscribe;
    }, [session.id, session.type]);
    
    const stats = useMemo(() => {
        const submitted = results.filter((t) => t.isSubmitted);
        const itemCounts = new Map();
        submitted.forEach(r => {
            if (r.selectedItems) {
                (r.selectedItems as string[]).forEach((item: string) => {
                    itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
                });
            }
        });
        const sortedItems = Array.from(itemCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        return { submittedCount: submitted.length, totalCount: results.length, sortedItems };
    }, [results]);

    if(isLoading) return <div className="text-center p-10 theme-text-primary">結果を読み込み中...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-center theme-text-primary">結果発表ボード: <span className="text-blue-500">{session.name}</span></h2>
              {onBack && <button className="text-blue-600 hover:underline font-medium" onClick={onBack}>戻る</button>}
            </div>
            <Card>
                <h3 className="text-xl font-bold mb-2 theme-text-primary">全体集計</h3>
                <p className="theme-text-secondary">{stats.submittedCount} / {stats.totalCount || '多数'} {session.type === 'lesson' ? 'チーム' : '人'} が提出済み</p>
                <div className={`mt-4 ${styles['results-chart-container']}`}>
                    <ResponsiveContainer><BarChart data={stats.sortedItems} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}><CartesianGrid strokeDasharray="0.5 0.5" strokeOpacity={0.3} /><XAxis type="number" allowDecimals={false} stroke="rgb(107 114 128)" /><YAxis dataKey="name" type="category" width={120} stroke="rgb(107 114 128)"/><Tooltip contentStyle={{backgroundColor: 'rgba(31, 41, 55, 0.8)', color: '#fff', border: 'none'}} cursor={{fill: 'rgba(156, 163, 175, 0.2)'}}/><Legend /><Bar dataKey="count" name={session.type === 'lesson' ? '選択チーム数' : '選択人数'} fill="#8884d8" /></BarChart></ResponsiveContainer>
                </div>
            </Card>
            {session.type === 'lesson' && (
              <Card>
                  <h3 className="text-xl font-bold mb-4 theme-text-primary">チームごとの詳細</h3>
                  <div className="space-y-4">{results.sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0)).map((team) => (
                      <div key={team.id} className="p-3 theme-bg-secondary rounded-lg">
                          <p className="font-bold text-lg theme-text-primary">チーム {team.teamNumber} {team.isSubmitted ? '✅' : '📝'}</p>
                          {team.isSubmitted && team.selectedItems && team.selectedItems.length > 0 ? <ul className="list-disc list-inside theme-text-primary">{team.selectedItems.map((item: string) => <li key={item}>{item}</li>)}</ul> : <p className="theme-text-secondary">（未提出または選択なし）</p>}
                      </div>
                  ))}</div>
              </Card>
            )}
        </div>
    );
};

export default ResultsDashboard;
