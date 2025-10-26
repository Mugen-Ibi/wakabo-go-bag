import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, appId, collection, query, onSnapshot } from '../../lib/firebase';
import { Card } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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

type ItemCount = { name: string; count: number };

const ResultsDashboard: React.FC<Props> = ({ session, onBack, myItems = [] }) => {
    const [results, setResults] = useState<TeamOrParticipant[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>("");
    const [topN, setTopN] = useState<number>(10);
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
        const itemCounts = new Map<string, number>();
        submitted.forEach(r => {
            if (r.selectedItems) {
                (r.selectedItems as string[]).forEach((item: string) => {
                    itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
                });
            }
        });
        const sortedItems: ItemCount[] = Array.from(itemCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        return { submittedCount: submitted.length, totalCount: results.length, sortedItems };
    }, [results]);

    const filteredItems: ItemCount[] = useMemo(() => {
        const term = search.trim().toLowerCase();
        let items = stats.sortedItems;
        if (term) items = items.filter((x) => x.name.toLowerCase().includes(term));
        if (topN > 0) items = items.slice(0, topN);
        return items;
    }, [stats.sortedItems, search, topN]);

    if(isLoading) return <div className="text-center p-10 theme-text-primary">結果を読み込み中...</div>;

    return (
        <div className="space-y-6">
                        <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-center theme-text-primary">結果発表ボード: <span className="text-blue-500">{session.name}</span></h2>
              {onBack && <button className="text-blue-600 hover:underline font-medium" onClick={onBack}>戻る</button>}
            </div>
                        <Card>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xl font-bold theme-text-primary">全体集計</h3>
                                    {stats.totalCount > 0 && (
                                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-600 text-white">
                                            提出率 {Math.round((stats.submittedCount / stats.totalCount) * 100)}%
                                        </span>
                                    )}
                                </div>
                                <p className="theme-text-secondary">{stats.submittedCount} / {stats.totalCount || '多数'} {session.type === 'lesson' ? 'チーム' : '人'} が提出済み</p>
                                <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm theme-text-secondary" htmlFor="search">検索</label>
                                        <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="アイテム名で検索" className="px-2 py-1 rounded theme-bg-input theme-text-primary theme-border text-sm" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm theme-text-secondary" htmlFor="topN">上位N</label>
                                        <select id="topN" value={topN} onChange={(e) => setTopN(parseInt(e.target.value, 10))} className="px-2 py-1 rounded theme-bg-input theme-text-primary theme-border text-sm">
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={0}>すべて</option>
                                        </select>
                                    </div>
                                </div>
                                                {myItems.length > 0 && (
                                                    <div className="mt-2 text-sm flex items-center gap-2">
                                                        <span className="my-item-legend-box" />
                                                        <span className="align-middle theme-text-secondary">緑のバーはあなたが選んだアイテム</span>
                                                    </div>
                                                )}
                <div className="mt-4 results-chart-container">
                                        <ResponsiveContainer>
                                            <BarChart data={filteredItems} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0.5 0.5" strokeOpacity={0.3} />
                                                <XAxis type="number" allowDecimals={false} stroke="rgb(107 114 128)" />
                                                <YAxis dataKey="name" type="category" width={120} stroke="rgb(107 114 128)"/>
                                                <Tooltip contentStyle={{backgroundColor: 'rgba(31, 41, 55, 0.8)', color: '#fff', border: 'none'}} cursor={{fill: 'rgba(156, 163, 175, 0.2)'}}/>
                                                <Legend />
                                                <Bar dataKey="count" name={session.type === 'lesson' ? '選択チーム数' : '選択人数'}>
                                                    {filteredItems.map((entry: ItemCount) => (
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
                                                    {team.isSubmitted && team.selectedItems && team.selectedItems.length > 0 ? (
                                                        <ul className="list-disc list-inside theme-text-primary">
                                                            {team.selectedItems.map((item: string) => (
                                                                <li key={item}>
                                                                    <span>{item}</span>
                                                                    {myItems.includes(item) && (
                                                                        <span className="ml-2 align-middle bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded">あなた</span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="theme-text-secondary">（未提出または選択なし）</p>
                                                    )}
                      </div>
                  ))}</div>
              </Card>
            )}
        </div>
    );
};

export default ResultsDashboard;
