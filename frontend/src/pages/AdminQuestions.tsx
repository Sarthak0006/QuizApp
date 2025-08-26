import { useEffect, useState } from "react";
import { api } from "../lib/axios";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

type Skill = { id: number; name: string };
type Question = { id: number; skill_id: number; text: string; options_json: Record<string, string>; correct_option: string };

export default function AdminQuestions() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [skillId, setSkillId] = useState<number | null>(null);
    const [items, setItems] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const s = await api.get("/api/skills?page=1&pageSize=100");
            setSkills(s.data.items || []);
            if (skillId) {
                const q = await api.get(`/api/questions?skillId=${skillId}&page=1&pageSize=50`);
                setItems(q.data.items || []);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);
    useEffect(() => { if (skillId) load(); }, [skillId]);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle>Questions</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Select onValueChange={(v) => setSkillId(Number(v))}>
                        <SelectTrigger><SelectValue placeholder="Filter by skill" /></SelectTrigger>
                        <SelectContent>
                            {skills.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <div className="space-y-2 max-h-[60vh] overflow-auto pr-2">
                        {items.map(q => (
                            <div key={q.id} className="rounded border p-3">
                                <div className="font-medium text-sm mb-1">{q.text}</div>
                                <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                                    {Object.entries(q.options_json).map(([k, v]) => (
                                        <li key={k}><b>{k}.</b> {v} {q.correct_option === k && <span className="ml-1 text-green-600">(correct)</span>}</li>
                                    ))}
                                </ul>
                                <div className="mt-2 flex gap-2">
                                    <Button size="sm" variant="outline" onClick={async () => {
                                        await api.delete(`/api/questions/${q.id}`);
                                        setItems(items.filter(i => i.id !== q.id));
                                    }}>Delete</Button>
                                </div>
                            </div>
                        ))}
                        {!items.length && <div className="text-sm text-muted-foreground">No questions.</div>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Add Question</CardTitle></CardHeader>
                <CardContent>
                    <AddQuestion skills={skills} onAdded={(q) => { if (q.skill_id === skillId) setItems(i => [q, ...i]); }} />
                </CardContent>
            </Card>
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

    async function save() {
        if (!canSave) return;
        setSaving(true);
        try {
            const res = await api.post("/api/questions", {
                skillId, text,
                options: { A, B, C, D },
                correctOption: correct
            });
            onAdded(res.data);
            setText(""); setA(""); setB(""); setC(""); setD(""); setCorrect("");
        } finally { setSaving(false); }
    }

    return (
        <div className="space-y-3">
            <Select defaultValue={skillId ? String(skillId) : undefined} onValueChange={(v) => setSkillId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                <SelectContent>
                    {skills.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Textarea placeholder="Question text" value={text} onChange={e => setText(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Option A" value={A} onChange={e => setA(e.target.value)} />
                <Input placeholder="Option B" value={B} onChange={e => setB(e.target.value)} />
                <Input placeholder="Option C" value={C} onChange={e => setC(e.target.value)} />
                <Input placeholder="Option D" value={D} onChange={e => setD(e.target.value)} />
            </div>
            <Select value={correct} onValueChange={(v) => setCorrect(v as any)}>
                <SelectTrigger><SelectValue placeholder="Correct option" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                </SelectContent>
            </Select>
            <Button onClick={save} disabled={!canSave || saving}>Save</Button>
        </div>
    );
}
