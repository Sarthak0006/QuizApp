import { Router } from "express";
import bcrypt from "bcrypt";
import { getPool } from "../lib/db";
import {
    signAccess, signRefresh, setAccessCookie, setRefreshCookie,
    clearAuthCookies, verifyRefresh
} from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import { requireCsrf } from "../middleware/csrf"; // you already have this

export const authRouter = Router();
const pool = getPool();

// Register (USER role)
authRouter.post("/register", async (req, res, next) => {
    try {
        const { username, password } = req.body ?? {};
        if (!username || !password) return res.status(400).json({ message: "username & password required" });

        const [rows] = await pool.query("SELECT id FROM users WHERE username = :u", { u: username });
        if ((rows as any[]).length) return res.status(409).json({ message: "User exists" });

        const hash = await bcrypt.hash(password, 12);
        const [result] = await pool.query("INSERT INTO users (username, password_hash) VALUES (:u, :p)", { u: username, p: hash });
        const id = (result as any).insertId as number;

        const access = signAccess({ sub: id, username, role: "USER" });
        const refresh = signRefresh({ sub: id, username, role: "USER" });

        setAccessCookie(res, access);
        setRefreshCookie(res, refresh);

        res.json({ message: "registered", user: { id, username, role: "USER" } });
    } catch (e) { next(e); }
});

// Login (issue both)
authRouter.post("/login", async (req, res, next) => {
    try {
        const { username, password } = req.body ?? {};
        if (!username || !password) return res.status(400).json({ message: "username & password required" });

        const [rows] = await pool.query("SELECT id, password_hash, role FROM users WHERE username = :u LIMIT 1", { u: username });
        const user = (rows as any[])[0];
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(400).json({ message: "Invalid credentials" });

        const access = signAccess({ sub: user.id, username, role: user.role });
        const refresh = signRefresh({ sub: user.id, username, role: user.role });

        setAccessCookie(res, access);
        setRefreshCookie(res, refresh);

        res.json({ message: "logged_in" });
    } catch (e) { next(e); }
});

// Refresh (stateless): read refresh cookie, verify, rotate both
authRouter.post("/refresh", requireCsrf, async (req, res, next) => {
    try {
        const token = req.cookies?.refresh;
        if (!token) return res.status(401).json({ message: "No refresh token" });

        const payload = verifyRefresh(token); // throws on invalid/expired
        // Optionally: verify user still exists (recommended)
        const [rows] = await getPool().query("SELECT id, username, role FROM users WHERE id = :id", { id: payload.sub });
        const user = (rows as any[])[0];
        if (!user) return res.status(401).json({ message: "User revoked" });

        // Rotate tokens
        const access = signAccess({ sub: user.id, username: user.username, role: user.role });
        const refresh = signRefresh({ sub: user.id, username: user.username, role: user.role });

        setAccessCookie(res, access);
        setRefreshCookie(res, refresh);

        res.json({ message: "refreshed" });
    } catch (e) { next(e); }
});

authRouter.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

// Logout: clear both cookies
authRouter.post("/logout", requireAuth, requireCsrf, (_req, res) => {
    clearAuthCookies(res);
    res.json({ message: "logged_out" });
});
