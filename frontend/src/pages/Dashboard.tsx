import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAppSelector } from "../hooks";
import { api } from "../lib/axios";
import { Clock, CheckCircle2, Circle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../components/ui/dialog";

import {
    ClipboardList,
    Layers as LayersIcon,
    BarChart3,
    UserCog,
    Users as UsersIcon,
    Layers as SkillsIcon,
    HelpCircle as QuestionsIcon,
    LineChart as LineIcon,
    Target as ScoreIcon
} from "lucide-react";

import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

/* ========= Types ========= */
type Role = "USER" | "ADMIN";
type Skill = { id: number; name: string; description?: string; created_at?: string };
type Question = { id: number; skill_id: number; text: string; options_json: Record<string, string>; correct_option?: string };
type AttemptRow = { id: number; userId: number; skillId: number; skill: string; score: number; total: number; startedAt: string; submittedAt: string };

/* ========= Main Dashboard ========= */
export default function Dashboard() {
    const user = useAppSelector(s => s.auth.user)!;

    return (
        <Tabs defaultValue="quiz" className="space-y-6">
            <TabsList className="flex flex-wrap">
                <TabsTrigger value="quiz"><ClipboardList className="h-4 w-4 mr-1" /> Quiz</TabsTrigger>
                <TabsTrigger value="attempts"><LayersIcon className="h-4 w-4 mr-1" /> My Attempts</TabsTrigger>
                <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 mr-1" /> Reports</TabsTrigger>
                {user.role === "ADMIN" && <TabsTrigger value="admin"><UserCog className="h-4 w-4 mr-1" /> Admin</TabsTrigger>}
            </TabsList>

            <TabsContent value="quiz"><QuizPanel /></TabsContent>
            <TabsContent value="attempts"><MyAttemptsPanel userId={user.sub} /></TabsContent>
            <TabsContent value="reports"><ReportsPanel userId={user.sub} /></TabsContent>
            {user.role === "ADMIN" && <TabsContent value="admin"><AdminPanel /></TabsContent>}
        </Tabs>
    );
}

/* ========= Quiz ========= */
function QuizPanel() {
    type Skill = { id: number; name: string; description?: string };
    type Question = { id: number; skill_id: number; text: string; options_json: Record<string, string> };
    const [skills, setSkills] = useState<Skill[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [skillId, setSkillId] = useState<number | null>(null);

    // quiz state
    const [started, setStarted] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [idx, setIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [result, setResult] = useState<{ score: number; total: number } | null>(null);
    const [loading, setLoading] = useState(false);

    // timer (e.g. 10 minutes)
    const QUIZ_MINUTES = 10;
    const [secondsLeft, setSecondsLeft] = useState(QUIZ_MINUTES * 60);
    const timerRef = useRef<number | null>(null);

    // bootstrap skills
    useEffect(() => {
        (async () => {
            const r = await api.get("/api/skills?page=1&pageSize=100");
            setSkills(r.data.items || []);
        })();
    }, []);

    async function handleSubmit(qs = questions) {
        if (!skillId || !qs.length) return;
        setLoading(true);
        try {
            const payload = {
                skillId,
                answers: qs.map(q => ({ questionId: q.id, selected: answers[q.id] || "" }))
            };
            const r = await api.post("/api/quiz/attempts", payload);
            const { score, total } = r.data.attempt;
            setResult({ score, total });
            setStarted(false);
            if (timerRef.current) window.clearInterval(timerRef.current);
        } finally {
            setLoading(false);
            setShowConfirm(false); // close modal after submit
        }
    }

    async function loadQuestionsAndStart(id: number) {
        setLoading(true);
        try {
            const r = await api.get(`/api/questions?skillId=${id}&page=1&pageSize=10`);
            const qs: Question[] = r.data.items || [];
            setQuestions(qs);
            setAnswers({});
            setIdx(0);
            setResult(null);
            setStarted(true);
            // reset and start timer
            setSecondsLeft(QUIZ_MINUTES * 60);
            if (timerRef.current) window.clearInterval(timerRef.current);
            timerRef.current = window.setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        window.clearInterval(timerRef.current!);
                        handleSubmit(qs); // auto-submit
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000) as unknown as number;
        } finally {
            setLoading(false);
        }
    }

    // cleanup timer
    useEffect(() => {
        return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    }, []);

    // formatted time
    const timeStr = useMemo(() => {
        const m = Math.floor(secondsLeft / 60);
        const s = secondsLeft % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }, [secondsLeft]);

    // progress
    const answeredCount = useMemo(
        () => questions.reduce((n, q) => n + (answers[q.id] ? 1 : 0), 0),
        [questions, answers]
    );
    const progressPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

    // actions
    function saveAnswer(qid: number, choice: string) {
        setAnswers(a => ({ ...a, [qid]: choice }));
    }
    function saveAndNext() {
        if (idx < questions.length - 1) setIdx(i => i + 1);
    }
    function prev() {
        if (idx > 0) setIdx(i => i - 1);
    }

    const current = questions[idx];

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* LEFT: Controls + Timer + Navigator */}
            <Card className="md:col-span-1 h-fit sticky top-24">
                <CardHeader>
                    <CardTitle>Quiz Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Skill selector before start */}
                    {!started && !result && (
                        <div className="space-y-2">
                            <Select
                                value={skillId ? String(skillId) : undefined}
                                onValueChange={(v) => setSkillId(Number(v))}
                            >
                                <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                                <SelectContent>
                                    {skills.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                                <Button onClick={() => skillId && loadQuestionsAndStart(skillId)} disabled={!skillId || loading}>
                                    Start Quiz
                                </Button>
                                <Button variant="outline" onClick={() => skillId && loadQuestionsAndStart(skillId)} disabled={!skillId || loading}>
                                    Reload
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Timer + Progress during quiz */}
                    {started && (
                        <>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4" /><span>Time left</span>
                                </div>
                                <Badge variant={secondsLeft < 60 ? "destructive" : "secondary"}>{timeStr}</Badge>
                            </div>
                            <div>
                                <div className="mb-1 text-xs text-muted-foreground">Progress: {answeredCount}/{questions.length}</div>
                                <Progress value={progressPct} />
                            </div>

                            {/* Question navigator */}
                            <div className="mt-2">
                                <div className="text-xs text-muted-foreground mb-2">Questions</div>
                                <div className="grid grid-cols-6 gap-2">
                                    {questions.map((q, i) => {
                                        const isCurrent = i === idx;
                                        const isAnswered = !!answers[q.id];
                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => setIdx(i)}
                                                className={[
                                                    "h-9 rounded-md border text-xs flex items-center justify-center",
                                                    isCurrent ? "bg-primary text-primary-foreground" :
                                                        isAnswered ? "bg-green-600/10 text-green-700 dark:text-green-300 border-green-600/30" :
                                                            "bg-muted hover:bg-accent"
                                                ].join(" ")}
                                                title={isAnswered ? "Answered" : "Unanswered"}
                                            >
                                                {isAnswered ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                                <span className="ml-1">{i + 1}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* After submit: result */}
                    {result && (
                        <div className="space-y-2">
                            <div className="text-sm">Score</div>
                            <div className="text-2xl font-semibold">{result.score} / {result.total}</div>
                            <Progress value={Math.round((result.score / result.total) * 100)} />
                            <Button className="w-full mt-2" variant="outline" onClick={() => {
                                setResult(null);
                                setAnswers({});
                                setQuestions([]);
                                setIdx(0);
                            }}>Reset</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* RIGHT: Question + Options */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>{started ? `Question ${idx + 1} of ${questions.length}` : "Take a quiz"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Before start */}
                    {!started && !result && (
                        <div className="text-sm text-muted-foreground">
                            Choose a skill on the left, then click <b>Start Quiz</b>.
                        </div>
                    )}

                    {/* During quiz */}
                    {started && current && (
                        <>
                            <div className="rounded-lg border p-4">
                                <div className="font-medium mb-3">{current.text}</div>
                                <div className="grid gap-2">
                                    {Object.entries(current.options_json).map(([k, v]) => (
                                        <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`q-${current.id}`}
                                                value={k}
                                                checked={answers[current.id] === k}
                                                onChange={() => saveAnswer(current.id, k)}
                                            />
                                            <span><b>{k}.</b> {v}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={prev} disabled={idx === 0}>Previous</Button>
                                    <Button onClick={saveAndNext} disabled={idx >= questions.length - 1}>Save & Next</Button>
                                </div>
                                <Button
                                    variant="default"
                                    onClick={() => setShowConfirm(true)}
                                    disabled={!questions.length || loading}
                                >
                                    Submit
                                </Button>

                                {/* Confirmation Modal */}
                                <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Submit Quiz?</DialogTitle>
                                        </DialogHeader>
                                        <p className="text-sm text-muted-foreground">
                                            Are you sure you want to submit your answers? Once submitted, you cannot change them.
                                        </p>
                                        <DialogFooter className="mt-4 flex justify-end gap-2">
                                            <Button variant="outline" onClick={() => setShowConfirm(false)}>
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={() => handleSubmit()}
                                                disabled={loading}
                                            >
                                                Yes, Submit
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </>
                    )}

                    {/* After submit: review summary (optional simple list) */}
                    {result && (
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">You can start another quiz from the left.</div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
/* ========= My Attempts ========= */
function MyAttemptsPanel({ userId, compact }: { userId?: number; compact?: boolean }) {
    const me = useAppSelector(s => s.auth.user);
    const uid = userId ?? me?.sub!;
    const [items, setItems] = useState<AttemptRow[]>([]);

    useEffect(() => {
        (async () => {
            const r = await api.get(`/api/quiz/attempts?userId=${uid}&page=1&pageSize=${compact ? 5 : 50}`);
            setItems(r.data.items || []);
        })();
    }, [uid, compact]);

    // ----- chart data -----
    const perAttempt = useMemo(() => items.map((a, i) => ({
        idx: i + 1,
        label: `${a.skill} #${a.id}`,
        date: new Date(a.submittedAt || a.startedAt).toLocaleDateString(),
        score: a.score,
        percent: Math.round((a.score / a.total) * 100),
    })), [items]);

    const passFail = useMemo(() => {
        let pass = 0, fail = 0;
        for (const a of items) ((a.score / a.total) * 100 >= 50 ? pass++ : fail++);
        return [
            { name: "Pass (≥50%)", value: pass },
            { name: "Fail (<50%)", value: fail }
        ];
    }, [items]);

    const PIE_COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#14B8A6"];

    if (!items.length) return <div className="text-sm text-muted-foreground">No attempts yet.</div>;

    return (
        <div className="space-y-6">
            {!compact && (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Bar: raw scores per attempt */}
                    <Card className="lg:col-span-1">
                        <CardHeader><CardTitle>Scores per attempt</CardTitle></CardHeader>
                        <CardContent className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={perAttempt}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="idx" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="score" fill="#6366F1" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Line: percentage over time */}
                    <Card className="lg:col-span-2">
                        <CardHeader><CardTitle>Performance over time</CardTitle></CardHeader>
                        <CardContent className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={perAttempt}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="percent" stroke="#22C55E" strokeWidth={2} dot={false} />
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
                                    <Pie data={passFail} dataKey="value" nameKey="name" outerRadius={90} label>
                                        {passFail.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Legend />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Original list */}
            <div className="space-y-2">
                {items.map(a => (
                    <div key={a.id} className="rounded-lg border p-3 text-sm flex justify-between">
                        <div>
                            <div className="font-medium">{a.skill}</div>
                            <div className="text-muted-foreground">
                                {new Date(a.submittedAt || a.startedAt).toLocaleString()}
                            </div>
                        </div>
                        <div className="font-semibold">{a.score}/{a.total}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}


/* ========= Reports ========= */
function ReportsPanel({ userId }: { userId: number }) {
    const [periodUI, setPeriodUI] = useState<"all" | "week" | "month">("all");
    const [rows, setRows] = useState<
        { skillId: number; skill: string; avgPercent: number; attemptsTotal: number }[]
    >([]);

    useEffect(() => {
        (async () => {
            const period = periodUI === "all" ? "" : periodUI;
            const q = period ? `?period=${period}` : "";
            const r = await api.get(`/api/reports/user/${userId}/performance${q}`);
            setRows(r.data.data || []);
        })();
    }, [userId, periodUI]);

    const max = useMemo(() => Math.max(100, ...rows.map(r => r.avgPercent)), [rows]);

    // ---- chart data ----
    const barAvg = rows.map(r => ({ skill: r.skill, avg: Math.round(r.avgPercent) }));
    const barCnt = rows.map(r => ({ skill: r.skill, attempts: r.attemptsTotal }));
    // const pieData = rows.map(r => ({ name: r.skill, value: r.attemptsTotal }));
    // const PIE_COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#14B8A6"];
    // 1) Build sanitized data
    const pieData = (rows ?? [])
        .map(r => ({
            name: r.skill,
            value: Number(r.attemptsTotal ?? 0),   // <- force number
        }))
        .filter(d => d.value > 0);               // <- drop zero/invalid slices

    const hasData = pieData.length > 0;

    const PIE_COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#14B8A6"];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Performance</CardTitle>
                <Select value={periodUI} onValueChange={(v) => setPeriodUI(v as any)}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All time" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="week">Last week</SelectItem>
                        <SelectItem value="month">Last month</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Charts */}
                {!!rows.length && (
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Avg % by skill */}
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Average score by skill</CardTitle></CardHeader>
                            <CardContent className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barAvg}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="skill" interval={0} angle={-15} height={60} />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Bar dataKey="avg" fill="#22C55E" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Attempts by skill */}
                        <Card>
                            <CardHeader><CardTitle>Attempts by skill</CardTitle></CardHeader>
                            <CardContent className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barCnt}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="skill" hide />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="attempts" fill="#6366F1" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Attempts share */}
                        <Card className="lg:col-span-3">
                            <CardHeader><CardTitle>Attempts share</CardTitle></CardHeader>
                            <CardContent className="min-w-0">
                                <div className="h-72 w-full">
                                    {!hasData ? (
                                        <div className="h-full grid place-items-center text-sm text-muted-foreground">
                                            No data to display.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart key={pieData.length /* remount on change */}>
                                                <Pie
                                                    data={pieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    outerRadius={90}
                                                    label
                                                    isAnimationActive={false}
                                                >
                                                    {pieData.map((_, i) => (
                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Legend />
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Your existing progress rows */}
                {!rows.length ? (
                    <div className="text-sm text-muted-foreground">No data yet.</div>
                ) : (
                    <div className="space-y-3">
                        {rows.map(r => (
                            <div key={r.skillId}>
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{r.skill}</span>
                                    <span>{r.avgPercent}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${(r.avgPercent / max) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


/* ========= Admin Panel (Overview + Users, Skills, Questions, All Attempts) ========= */
function AdminPanel() {
    const [tab, setTab] = useState<"overview" | "users" | "skills" | "questions" | "attempts">("overview");
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Admin</CardTitle>
                <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="skills">Skills</TabsTrigger>
                        <TabsTrigger value="questions">Questions</TabsTrigger>
                        <TabsTrigger value="attempts">All Attempts</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                {tab === "overview" && <AdminOverview />}
                {tab === "users" && <AdminUsersInline />}
                {tab === "skills" && <AdminSkillsInline />}
                {tab === "questions" && <AdminQuestionsInline />}
                {tab === "attempts" && <AllAttemptsInline />}
            </CardContent>
        </Card>
    );
}

/* ----- Admin Overview (charts + KPIs) ----- */
function AdminOverview() {
    const [range, setRange] = useState<"7d" | "30d">("7d");
    const [attempts, setAttempts] = useState<AttemptRow[]>([]);
    const [users, setUsers] = useState<{ id: number; username: string; role: Role }[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [questionsCount, setQuestionsCount] = useState<number>(0);

    useEffect(() => {
        (async () => {
            const pageSize = 100;
            const p1 = await api.get(`/api/quiz/attempts?page=1&pageSize=${pageSize}`);
            const total = p1.data.total || 0;
            const pages = Math.min(5, Math.ceil(total / pageSize));
            let all: AttemptRow[] = p1.data.items || [];
            for (let p = 2; p <= pages; p++) {
                const r = await api.get(`/api/quiz/attempts?page=${p}&pageSize=${pageSize}`);
                all = all.concat(r.data.items || []);
            }
            setAttempts(all);

            const u = await api.get(`/api/users?page=1&pageSize=500`);
            setUsers(u.data.items || []);

            const s = await api.get(`/api/skills?page=1&pageSize=500`);
            setSkills(s.data.items || []);

            // sum question counts per-skill (using total header)
            let qCount = 0;
            for (const sk of s.data.items || []) {
                const q = await api.get(`/api/questions?skillId=${sk.id}&page=1&pageSize=1`);
                qCount += q.data.total || 0;
            }
            setQuestionsCount(qCount);
        })();
    }, []);

    const filtered = useMemo(() => {
        const now = Date.now();
        const days = range === "7d" ? 7 : 30;
        const since = now - days * 86400_000;
        return attempts.filter(a => {
            const ts = new Date(a.submittedAt || a.startedAt).getTime();
            return ts >= since;
        });
    }, [attempts, range]);

    // const totalAttempts = filtered.length;
    const avgPercent = filtered.length
        ? Math.round((filtered.reduce((acc, a) => acc + (a.score / a.total) * 100, 0) / filtered.length))
        : 0;
    const adminCount = users.filter(u => u.role === "ADMIN").length;
    const userCount = users.length;

    const byDay = useMemo(() => {
        const map = new Map<string, { date: string; attempts: number }>();
        const days = range === "7d" ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            map.set(key, { date: key, attempts: 0 });
        }
        for (const a of filtered) {
            const d = new Date(a.submittedAt || a.startedAt); d.setHours(0, 0, 0, 0);
            const key = d.toISOString().slice(0, 10);
            const row = map.get(key);
            if (row) row.attempts++;
        }
        return Array.from(map.values());
    }, [filtered, range]);

    const bySkill = useMemo(() => {
        const agg = new Map<number, { skill: string; s: number; t: number }>();
        for (const a of filtered) {
            const row = agg.get(a.skillId) || { skill: a.skill, s: 0, t: 0 };
            row.s += a.score; row.t += a.total;
            agg.set(a.skillId, row);
        }
        return Array.from(agg.entries()).map(([_, r]) => ({
            skill: r.skill,
            avg: r.t ? Math.round((r.s / r.t) * 100) : 0
        })).sort((a, b) => b.avg - a.avg).slice(0, 8);
    }, [filtered]);

    const rolePie = useMemo(() => ([
        { name: "Admins", value: adminCount },
        { name: "Users", value: Math.max(0, userCount - adminCount) }
    ]), [adminCount, userCount]);

    const PIE_COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4"];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing last {range === "7d" ? "7 days" : "30 days"} of data
                </div>
                <Select value={range} onValueChange={(v) => setRange(v as any)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPI icon={<UsersIcon className="h-4 w-4" />} label="Total Users" value={userCount} />
                <KPI icon={<SkillsIcon className="h-4 w-4" />} label="Skills" value={skills.length} />
                <KPI icon={<QuestionsIcon className="h-4 w-4" />} label="Questions" value={questionsCount} />
                <KPI icon={<ScoreIcon className="h-4 w-4" />} label="Avg Score" value={`${avgPercent}%`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2"><LineIcon className="h-4 w-4" />Attempts over time</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={byDay}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="attempts" stroke="#6366F1" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Average score by skill</CardTitle></CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bySkill}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="skill" tick={{ fontSize: 12 }} interval={0} angle={-20} height={60} />
                                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                                <Tooltip />
                                <Bar dataKey="avg" fill="#22C55E" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>User roles</CardTitle></CardHeader>
                <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={rolePie} dataKey="value" nameKey="name" outerRadius={90} label>
                                {rolePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Legend />
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}

/* Small KPI card */
function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{label}</div>
                    <div className="text-muted-foreground">{icon}</div>
                </div>
                <div className="text-2xl font-bold">{value}</div>
            </CardHeader>
        </Card>
    );
}

/* ----- Admin: Users ----- */
function AdminUsersInline() {
    type Row = { id: number; username: string; role: Role; created_at: string };
    const [q, setQ] = useState(""); const [page, setPage] = useState(1); const pageSize = 10;
    const [rows, setRows] = useState<Row[]>([]); const [total, setTotal] = useState(0);

    const load = async () => {
        const r = await api.get(`/api/users?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`);
        setRows(r.data.items || []); setTotal(r.data.total || 0);
    };
    useEffect(() => { load(); }, [q, page]);

    return (
        <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Search username..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
                <CreateUser onCreated={load} />
            </div>
            <div className="border rounded divide-y">
                {rows.map(u => (
                    <div key={u.id} className="p-3 flex items-center justify-between">
                        <div className="text-sm">
                            <div className="font-medium">{u.username}</div>
                            <div className="text-muted-foreground">{u.role} • {new Date(u.created_at).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={async () => {
                                const role: Role = u.role === "ADMIN" ? "USER" : "ADMIN";
                                await api.patch(`/api/users/${u.id}`, { role }); load();
                            }}>{u.role === "ADMIN" ? "Demote" : "Promote"}</Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                                const pwd = prompt(`New password for ${u.username}`); if (!pwd) return;
                                await api.patch(`/api/users/${u.id}`, { password: pwd }); alert("Password updated");
                            }}>Password</Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                                if (!confirm("Delete user?")) return;
                                await api.delete(`/api/users/${u.id}`); load();
                            }}>Delete</Button>
                        </div>
                    </div>
                ))}
                {!rows.length && <div className="p-3 text-sm text-muted-foreground">No users</div>}
            </div>
            <Pager {...{ page, pageSize, total, onChange: setPage }} />
        </div>
    );
}

function CreateUser({ onCreated }: { onCreated: () => void }) {
    const [username, setU] = useState(""); const [password, setP] = useState(""); const [role, setR] = useState<Role>("USER"); const [saving, setSaving] = useState(false);
    return (
        <div className="flex gap-2">
            <Input placeholder="New username" value={username} onChange={e => setU(e.target.value)} />
            <Input placeholder="Password" type="password" value={password} onChange={e => setP(e.target.value)} />
            <Select value={role} onValueChange={v => setR(v as Role)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
            </Select>
            <Button disabled={saving || !username || !password} onClick={async () => {
                setSaving(true);
                try { await api.post("/api/users", { username, password, role }); setU(""); setP(""); setR("USER"); onCreated(); }
                finally { setSaving(false); }
            }}>Add</Button>
        </div>
    );
}

/* ----- Admin: Skills ----- */
function AdminSkillsInline() {
    const [q, setQ] = useState(""); const [page, setPage] = useState(1); const pageSize = 10;
    const [rows, setRows] = useState<Skill[]>([]); const [total, setTotal] = useState(0);

    const load = async () => {
        const r = await api.get(`/api/skills?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`);
        setRows(r.data.items || []); setTotal(r.data.total || 0);
    };
    useEffect(() => { load(); }, [q, page]);

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Input placeholder="Search skill..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
                <CreateSkill onCreated={load} />
            </div>
            <div className="border rounded divide-y">
                {rows.map(s => (
                    <div key={s.id} className="p-3 flex items-center justify-between">
                        <div className="text-sm">
                            <div className="font-medium">{s.name}</div>
                            <div className="text-muted-foreground">{s.description || "-"}</div>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={async () => {
                                const name = prompt("New name", s.name) ?? s.name;
                                const description = prompt("New description", s.description || "") ?? s.description;
                                await api.patch(`/api/skills/${s.id}`, { name, description }); load();
                            }}>Edit</Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                                if (!confirm("Delete skill?")) return;
                                await api.delete(`/api/skills/${s.id}`); load();
                            }}>Delete</Button>
                        </div>
                    </div>
                ))}
                {!rows.length && <div className="p-3 text-sm text-muted-foreground">No skills</div>}
            </div>
            <Pager {...{ page, pageSize, total, onChange: setPage }} />
        </div>
    );
}

function CreateSkill({ onCreated }: { onCreated: () => void }) {
    const [name, setName] = useState(""); const [description, setDesc] = useState(""); const [saving, setSaving] = useState(false);
    return (
        <div className="flex gap-2">
            <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Description" value={description} onChange={e => setDesc(e.target.value)} />
            <Button disabled={saving || !name} onClick={async () => {
                setSaving(true);
                try { await api.post("/api/skills", { name, description }); setName(""); setDesc(""); onCreated(); }
                finally { setSaving(false); }
            }}>Add</Button>
        </div>
    );
}

/* ----- Admin: Questions ----- */
function AdminQuestionsInline() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [skillId, setSkillId] = useState<number | undefined>(undefined);
    const [items, setItems] = useState<Question[]>([]);

    useEffect(() => {
        (async () => {
            const s = await api.get("/api/skills?page=1&pageSize=100");
            setSkills(s.data.items || []);
        })();
    }, []);

    useEffect(() => {
        (async () => {
            if (!skillId) { setItems([]); return; }
            const q = await api.get(`/api/questions?skillId=${skillId}&page=1&pageSize=100`);
            setItems(q.data.items || []);
        })();
    }, [skillId]);

    return (
        <div className="space-y-3">
            <div className="flex gap-2 items-center">
                <Select value={skillId ? String(skillId) : undefined} onValueChange={(v) => setSkillId(Number(v))}>
                    <SelectTrigger className="w-60"><SelectValue placeholder="Filter by skill" /></SelectTrigger>
                    <SelectContent>
                        {skills.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <AddQuestion skills={skills} onAdded={(q) => { if (q.skill_id === skillId) setItems(i => [q, ...i]); }} />
            </div>
            <div className="border rounded divide-y max-h-[60vh] overflow-auto">
                {items.map(q => (
                    <div key={q.id} className="p-3">
                        <div className="font-medium text-sm mb-1">{q.text}</div>
                        <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                            {Object.entries(q.options_json).map(([k, v]) => (
                                <li key={k}><b>{k}.</b> {v} {q.correct_option === k && <span className="ml-1 text-green-600">(correct)</span>}</li>
                            ))}
                        </ul>
                        <div className="mt-2">
                            <Button size="sm" variant="outline" onClick={async () => {
                                await api.delete(`/api/questions/${q.id}`);
                                setItems(items.filter(i => i.id !== q.id));
                            }}>Delete</Button>
                        </div>
                    </div>
                ))}
                {!items.length && <div className="p-3 text-sm text-muted-foreground">No questions</div>}
            </div>
        </div>
    );
}

function AddQuestion({ skills, onAdded }: { skills: Skill[]; onAdded: (q: Question) => void }) {
    const [skillId, setSkillId] = useState<number | null>(skills[0]?.id ?? null);
    const [text, setText] = useState("");
    const [A, setA] = useState(""); const [B, setB] = useState(""); const [C, setC] = useState(""); const [D, setD] = useState("");
    const [correct, setCorrect] = useState<"A" | "B" | "C" | "D" | "">("");
    const [saving, setSaving] = useState(false);
    const canSave = skillId && text && A && B && C && D && correct;

    return (
        <div className="flex flex-wrap gap-2 items-center">
            <Select value={skillId ? String(skillId) : undefined} onValueChange={(v) => setSkillId(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Skill" /></SelectTrigger>
                <SelectContent>{skills.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="min-w-[220px]" placeholder="Question" value={text} onChange={e => setText(e.target.value)} />
            <Input placeholder="A" value={A} onChange={e => setA(e.target.value)} />
            <Input placeholder="B" value={B} onChange={e => setB(e.target.value)} />
            <Input placeholder="C" value={C} onChange={e => setC(e.target.value)} />
            <Input placeholder="D" value={D} onChange={e => setD(e.target.value)} />
            <Select value={correct} onValueChange={(v) => setCorrect(v as any)}>
                <SelectTrigger className="w-24"><SelectValue placeholder="Correct" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                </SelectContent>
            </Select>
            <Button disabled={!canSave || saving} onClick={async () => {
                setSaving(true);
                try {
                    const r = await api.post("/api/questions", { skillId, text, options: { A, B, C, D }, correctOption: correct });
                    onAdded(r.data);
                    setText(""); setA(""); setB(""); setC(""); setD(""); setCorrect("");
                } finally { setSaving(false); }
            }}>Add</Button>
        </div>
    );
}

/* ----- Admin: All Attempts ----- */
function AllAttemptsInline() {
    const [userId, setUserId] = useState<string>(""); const [rows, setRows] = useState<AttemptRow[]>([]);
    const [page, setPage] = useState(1); const pageSize = 10; const [total, setTotal] = useState(0);

    const load = async () => {
        const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (userId.trim()) qs.set("userId", userId.trim());
        const r = await api.get(`/api/quiz/attempts?${qs.toString()}`);
        setRows(r.data.items || []); setTotal(r.data.total || 0);
    };
    useEffect(() => { load(); }, [page]); // eslint-disable-line

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Input className="w-40" placeholder="Filter by userId" value={userId} onChange={e => setUserId(e.target.value)} />
                <Button variant="outline" onClick={() => { setPage(1); load(); }}>Apply</Button>
            </div>
            <div className="border rounded divide-y">
                {rows.map(a => (
                    <div key={a.id} className="p-3 flex items-center justify-between text-sm">
                        <div>
                            <div className="font-medium">{a.skill}</div>
                            <div className="text-muted-foreground">{new Date(a.submittedAt || a.startedAt).toLocaleString()} • user #{a.userId}</div>
                        </div>
                        <div className="font-semibold">{a.score}/{a.total}</div>
                    </div>
                ))}
                {!rows.length && <div className="p-3 text-sm text-muted-foreground">No attempts</div>}
            </div>
            <Pager {...{ page, pageSize, total, onChange: setPage }} />
        </div>
    );
}

/* ----- Tiny pager ----- */
function Pager({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    return (
        <div className="flex justify-end items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}>Prev</Button>
            <span className="text-sm">Page {page} / {pages}</span>
            <Button variant="outline" size="sm" onClick={() => onChange(Math.min(pages, page + 1))} disabled={page >= pages}>Next</Button>
        </div>
    );
}
