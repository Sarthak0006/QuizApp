import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { setLoading, setError, setUser } from "../store/authSlice";
import { api } from "../lib/axios";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterPage() {
    const nav = useNavigate();
    const dispatch = useAppDispatch();
    const loading = useAppSelector(s => s.auth.loading);
    const [username, setU] = useState("");
    const [password, setP] = useState("");
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        dispatch(setLoading(true));
        dispatch(setError(null));
        try {
            await api.post("/api/auth/register", { username, password });
            const me = await api.get("/api/auth/me");
            dispatch(setUser(me.data.user));
            nav("/");
        } catch (e: any) {
            const msg = e?.response?.data?.message || e.message || "Registration failed";
            setErr(msg);
            dispatch(setError(msg));
        } finally {
            dispatch(setLoading(false));
        }
    }

    return (
        <div className="grid place-items-center min-h-[70vh]">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-xl">Create account</CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-3" onSubmit={onSubmit}>
                        <Input placeholder="Username" value={username} onChange={e => setU(e.target.value)} required />
                        <Input type="password" placeholder="Password" value={password} onChange={e => setP(e.target.value)} required />
                        {err && <div className="text-sm text-red-600">{err}</div>}
                        <Button className="w-full" disabled={loading} type="submit">Register</Button>
                        <div className="text-xs text-center text-muted-foreground">
                            Have an account? <Link to="/login" className="underline">Login</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
