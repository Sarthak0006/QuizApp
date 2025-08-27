import { useEffect, useState } from "react";
import { api } from "../lib/axios";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import Pagination from "../components/Pagination";

type UserRow = { id: number; username: string; role: "USER" | "ADMIN"; created_at: string };

export default function AdminUsers() {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [rows, setRows] = useState<UserRow[]>([]);
    const [total, setTotal] = useState(0);
    // const [loading, setLoading] = useState(false);

    async function load() {
        // setLoading(true);
        try {
            const res = await api.get(`/api/users?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`);
            setRows(res.data.items || []);
            setTotal(res.data.total || 0);
        } finally { /* setLoading(false); */ }
    }

    useEffect(() => { load(); }, [q, page]);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle>Users</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <Input placeholder="Search username..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
                    <div className="border rounded divide-y">
                        {rows.map(u => (
                            <div key={u.id} className="p-3 flex items-center justify-between">
                                <div className="text-sm">
                                    <div className="font-medium">{u.username}</div>
                                    <div className="text-muted-foreground">{u.role} • {new Date(u.created_at).toLocaleString()}</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={async () => {
                                        const role = u.role === "ADMIN" ? "USER" : "ADMIN";
                                        await api.patch(`/api/users/${u.id}`, { role });
                                        load();
                                    }}>{u.role === "ADMIN" ? "Demote" : "Promote"}</Button>
                                    <Button size="sm" variant="outline" onClick={async () => {
                                        const pwd = prompt("New password for " + u.username);
                                        if (!pwd) return;
                                        await api.patch(`/api/users/${u.id}`, { password: pwd });
                                        alert("Password updated");
                                    }}>Password</Button>
                                    <Button size="sm" variant="outline" onClick={async () => {
                                        if (!confirm("Delete user?")) return;
                                        await api.delete(`/api/users/${u.id}`);
                                        load();
                                    }}>Delete</Button>
                                </div>
                            </div>
                        ))}
                        {!rows.length && <div className="p-3 text-sm text-muted-foreground">No users</div>}
                    </div>
                    <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Create user</CardTitle></CardHeader>
                <CardContent>
                    <CreateUser onCreated={load} />
                </CardContent>
            </Card>
        </div>
    );
}

function CreateUser({ onCreated }: { onCreated: () => void }) {
    const [username, setU] = useState("");
    const [password, setP] = useState("");
    const [role, setR] = useState<"USER" | "ADMIN">("USER");
    const [saving, setSaving] = useState(false);

    async function submit() {
        if (!username || !password) return;
        setSaving(true);
        try {
            await api.post("/api/users", { username, password, role });
            setU(""); setP(""); setR("USER");
            onCreated();
        } finally { setSaving(false); }
    }

    return (
        <div className="space-y-3">
            <Input placeholder="Username" value={username} onChange={e => setU(e.target.value)} />
            <Input type="password" placeholder="Password" value={password} onChange={e => setP(e.target.value)} />
            <div className="flex gap-2">
                <Button type="button" variant={role === "USER" ? "default" : "outline"} onClick={() => setR("USER")}>USER</Button>
                <Button type="button" variant={role === "ADMIN" ? "default" : "outline"} onClick={() => setR("ADMIN")}>ADMIN</Button>
            </div>
            <Button onClick={submit} disabled={saving || !username || !password}>Create</Button>
        </div>
    );
}
