import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from './ResultsDashboard.module.css';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { Card } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { TeamResult, SessionStats } from '../../types';

type SessionLike = { id: string; name: string; type: 'lesson' | 'workshop' };

type TeamOrParticipant = {
  id: string;
  teamNumber?: number;
  isSubmitted?: boolean;
  selectedItems?: string[];
};

interface Props {
    session: SessionLike;
    onBack?: () => void;
    myItems?: string[]; // 自分が選んだアイテム名のリスト（色分け用・任意）
}

const ResultsDashboard: React.FC<Props> = ({ session, onBack, myItems = [] }) => {
    const [results, setResults] = useState<TeamOrParticipant[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showTopN, setShowTopN] = useState<number>(0); // 0 means show all
    const [searchQuery, setSearchQuery] = useState<string>('');
    const mountedRef = useRef<boolean>(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!mountedRef.current) return;
        
        let q;
        if (session.type === 'lesson') {
            q = query(collection(db, "artifacts", appId, "public", "data", "trainingSessions", session.id, "teams"));
        } else {
            q = query(collection(db, "artifacts", appId, "public", "data", "trainingSessions", session.id, "participants"));
        }
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!mountedRef.current) return; // アンマウント後は状態を更新しない
            
            try {
                const resultsData = snapshot.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        teamNumber: data.teamNumber,
                        isSubmitted: data.isSubmitted,
                        selectedItems: data.selectedItems ?? []
                    };
                });
                
                setResults(resultsData);
                setIsLoading(false);
            } catch (error) {
                console.error('Error processing results data:', error);
                if (mountedRef.current) {
                    setIsLoading(false);
                }
            }
        }, (error) => {
            console.error('Error listening to results:', error);
            if (mountedRef.current) {
                setIsLoading(false);
            }
        });
        
        return () => {
            unsubscribe();
        };
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
        let sortedItems = Array.from(itemCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        
        // Apply search filter
        if (searchQuery.trim()) {
            sortedItems = sortedItems.filter(item => 
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        // Apply top N filter
        if (showTopN > 0) {
            sortedItems = sortedItems.slice(0, showTopN);
        }
        
        return { submittedCount: submitted.length, totalCount: results.length, sortedItems };
    }, [results, searchQuery, showTopN]);

    if(isLoading) return <div className="text-center p-10 theme-text-primary">結果を読み込み中...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-center theme-text-primary">結果発表ボード: <span className="text-blue-500">{session.name}</span></h2>
              {onBack && <button className="text-blue-600 hover:underline font-medium" onClick={onBack}>戻る</button>}
            </div>
                        <Card>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold theme-text-primary">全体集計</h3>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            進行状況: {stats.submittedCount} / {stats.totalCount || '多数'}
                        </span>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                            stats.totalCount > 0 && (stats.submittedCount / stats.totalCount) >= 0.8 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : (stats.submittedCount / stats.totalCount) >= 0.5
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                            {stats.totalCount > 0 ? Math.round((stats.submittedCount / stats.totalCount) * 100) : 0}%
                        </span>
                    </div>
                </div>
                                <p className="theme-text-secondary">{stats.submittedCount} / {stats.totalCount || '多数'} {session.type === 'lesson' ? 'チーム' : '人'} が提出済み</p>
                                                {myItems.length > 0 && (
                                                    <div className="mt-2 text-sm flex items-center gap-2">
                                                        <span className={styles['my-item-legend-box']} />
                                                        <span className="align-middle theme-text-secondary">緑のバーはあなたが選んだアイテム</span>
                                                    </div>
                                                )}
                <div className="mt-4 mb-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="search" className="text-sm font-medium theme-text-primary">検索:</label>
                        <input
                            id="search"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="アイテム名で検索"
                            className="px-3 py-1 text-sm border rounded-lg theme-bg-card theme-text-primary theme-border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="topN" className="text-sm font-medium theme-text-primary">表示件数:</label>
                        <select
                            id="topN"
                            value={showTopN}
                            onChange={(e) => setShowTopN(Number(e.target.value))}
                            className="px-3 py-1 text-sm border rounded-lg theme-bg-card theme-text-primary theme-border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={0}>すべて表示</option>
                            <option value={5}>上位5位</option>
                            <option value={10}>上位10位</option>
                            <option value={15}>上位15位</option>
                            <option value={20}>上位20位</option>
                        </select>
                    </div>
                </div>
                <div className={`mt-4 ${styles['results-chart-container']}`}>
                                        <ResponsiveContainer>
                                            <BarChart data={stats.sortedItems} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0.5 0.5" strokeOpacity={0.3} />
                                                <XAxis type="number" allowDecimals={false} stroke="rgb(107 114 128)" />
                                                <YAxis dataKey="name" type="category" width={120} stroke="rgb(107 114 128)"/>
                                                <Tooltip contentStyle={{backgroundColor: 'rgba(31, 41, 55, 0.8)', color: '#fff', border: 'none'}} cursor={{fill: 'rgba(156, 163, 175, 0.2)'}}/>
                                                <Legend />
                                                <Bar dataKey="count" name={session.type === 'lesson' ? '選択チーム数' : '選択人数'}>
                                                    {stats.sortedItems.map((entry: any) => (
                                                        <Cell key={`cell-${entry.name}`} fill={myItems.includes(entry.name) ? '#34d399' : '#8884d8'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                </div>
            </Card>
            {session.type === 'lesson' && (
              <Card>
                  <h3 className="text-xl font-bold mb-4 theme-text-primary">チームごとの詳細</h3>
                  <div className="space-y-4">{results.sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0)).map((team) => (
                      <div key={team.id} className="p-3 theme-bg-secondary rounded-lg">
                          <p className="font-bold text-lg theme-text-primary">チーム {team.teamNumber} {team.isSubmitted ? '✅' : '📝'}</p>
                          {team.isSubmitted && team.selectedItems && team.selectedItems.length > 0 ? 
                            <ul className="list-disc list-inside theme-text-primary space-y-1">
                                {team.selectedItems.map((item: string) => (
                                    <li key={item} className="flex items-center gap-2">
                                        <span>{item}</span>
                                        {myItems.includes(item) && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                                あなたも選択
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul> : 
                            <p className="theme-text-secondary">（未提出または選択なし）</p>
                          }
                      </div>
                  ))}</div>
              </Card>
            )}
        </div>
    );
};

export default ResultsDashboard;
