import { useEffect, useState, useMemo } from "react";
import { useAppSelector } from "../hooks";
import { api } from "../lib/axios";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import Pagination from "../components/Pagination";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

type Row = { id: number; userId: number; skillId: number; skill: string; score: number; total: number; startedAt: string; submittedAt: string };

export default function AttemptsPage() {
    const me = useAppSelector(s => s.auth.user)!;
    const [userId, setUserId] = useState<string>(me.role === "ADMIN" ? "" : String(me.sub));
    const [rows, setRows] = useState<Row[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    async function load() {
        const u = userId.trim();
        const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (u) qs.set("userId", u);
        const res = await api.get(`/api/quiz/attempts?${qs.toString()}`);
        setRows(res.data.items || []);
        setTotal(res.data.total || 0);
    }

    useEffect(() => { load(); }, [page]); // eslint-disable-line

    /* ---------- Chart data ---------- */
    const chartData = useMemo(() => rows.map(a => ({
        name: a.skill,
        date: new Date(a.submittedAt || a.startedAt).toLocaleDateString(),
        score: a.score,
        percent: Math.round((a.score / a.total) * 100)
    })), [rows]);

    const pieData = useMemo(() => {
        let pass = 0, fail = 0;
        rows.forEach(r => {
            const pct = (r.score / r.total) * 100;
            pct >= 50 ? pass++ : fail++;
        });
        return [
            { name: "Pass (≥50%)", value: pass },
            { name: "Fail (<50%)", value: fail }
        ];
    }, [rows]);

    const PIE_COLORS = ["#22C55E", "#EF4444"];

    return (
        <Card>
            <CardHeader className="flex items-center justify-between flex-row">
                <CardTitle>Quiz Attempts</CardTitle>
                {me.role === "ADMIN" && (
                    <div className="flex gap-2">
                        <Input placeholder="Filter by userId" value={userId} onChange={e => setUserId(e.target.value)} className="w-40" />
                        <Button variant="outline" onClick={() => { setPage(1); load(); }}>Apply</Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-6">

                {/* ---------- Charts row ---------- */}
                {!!rows.length && (
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Bar: Scores per attempt */}
                        <Card className="lg:col-span-1">
                            <CardHeader><CardTitle>Scores</CardTitle></CardHeader>
                            <CardContent className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="score" fill="#6366F1" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Line: % over time */}
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Performance over time</CardTitle></CardHeader>
                            <CardContent className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="percent" stroke="#22C55E" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Pie: pass vs fail */}
                        <Card className="lg:col-span-3">
                            <CardHeader><CardTitle>Pass vs Fail</CardTitle></CardHeader>
                            <CardContent className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            outerRadius={90}
                                            label
                                        >
                                            {pieData.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend />
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ---------- Table ---------- */}
                <div className="border rounded divide-y">
                    {rows.map(a => (
                        <div key={a.id} className="p-3 flex items-center justify-between text-sm">
                            <div>
                                <div className="font-medium">{a.skill}</div>
                                <div className="text-muted-foreground">
                                    {new Date(a.submittedAt || a.startedAt).toLocaleString()}
                                    {me.role === "ADMIN" && <span className="ml-2">• user #{a.userId}</span>}
                                </div>
                            </div>
                            <div className="font-semibold">{a.score}/{a.total}</div>
                        </div>
                    ))}
                    {!rows.length && <div className="p-3 text-sm text-muted-foreground">No attempts</div>}
                </div>
                <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </CardContent>
        </Card>
    );
}
