import { useState } from "react";
import { useAppDispatch } from "../hooks";
import { setError, setUser } from "../store/authSlice";
import { api } from "../lib/axios";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
    const nav = useNavigate();
    const dispatch = useAppDispatch();
    const [username, setU] = useState("");
    const [password, setP] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [pending, setPending] = useState(false); // <-- local

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        dispatch(setError(null));
        setPending(true);                  // <-- start local pending
        try {
            await api.post("/api/auth/login", { username, password });
            const me = await api.get("/api/auth/me");
            dispatch(setUser(me.data.user));
            nav("/");
        } catch (e: any) {
            const msg = e?.response?.data?.message || e.message || "Login failed";
            setErr(msg);
            dispatch(setError(msg));
        } finally {
            setPending(false);              // <-- stop local pending
        }
    }

    return (
        <div className="grid place-items-center min-h-[70vh]">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-xl">Welcome back</CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-3" onSubmit={onSubmit}>
                        <Input placeholder="Username" value={username} onChange={e => setU(e.target.value)} required />
                        <Input type="password" placeholder="Password" value={password} onChange={e => setP(e.target.value)} required />
                        {err && <div className="text-sm text-red-600">{err}</div>}
                        <Button className="w-full" disabled={pending || !username || !password} type="submit">
                            {pending ? "Logging in..." : "Login"}
                        </Button>
                        <div className="text-xs text-center text-muted-foreground">
                            No account? <Link to="/register" className="underline">Register</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
