import { useEffect, useState } from "react";
import { api } from "../lib/axios";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import Pagination from "../components/Pagination";

type Skill = { id:number; name:string; description?:string; created_at:string };

export default function AdminSkills() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [rows, setRows] = useState<Skill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/api/skills?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`);
      setRows(res.data.items || []); setTotal(res.data.total || 0);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, [q, page]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search skill..." value={q} onChange={e=>{ setQ(e.target.value); setPage(1); }} />
          <div className="border rounded divide-y">
            {rows.map(s => (
              <div key={s.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-muted-foreground">{s.description || "-"}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async ()=>{
                      const name = prompt("New name", s.name) ?? s.name;
                      const description = prompt("New description", s.description || "") ?? s.description;
                      await api.patch(`/api/skills/${s.id}`, { name, description });
                      load();
                    }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={async ()=>{
                      if (!confirm("Delete skill?")) return;
                      await api.delete(`/api/skills/${s.id}`);
                      load();
                    }}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
            {!rows.length && <div className="p-3 text-sm text-muted-foreground">No skills</div>}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Create skill</CardTitle></CardHeader>
        <CardContent>
          <CreateSkill onCreated={load} />
        </CardContent>
      </Card>
    </div>
  );
}

function CreateSkill({ onCreated }: { onCreated: ()=>void }) {
  const [name, setName] = useState("");
  const [description, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name) return;
    setSaving(true);
    try {
      await api.post("/api/skills", { name, description });
      setName(""); setDesc("");
      onCreated();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <Input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
      <Input placeholder="Description" value={description} onChange={e=>setDesc(e.target.value)} />
      <Button onClick={submit} disabled={saving || !name}>Create</Button>
    </div>
  );
}
