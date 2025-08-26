import { Router } from "express";
import bcrypt from "bcrypt";
import { getPool } from "../lib/db";
import { getPagination } from "../utils/pagination";
import { requireAuth, requireRole } from "../middleware/auth";

export const usersRouter = Router();
const pool = getPool();

usersRouter.use(requireAuth, requireRole("ADMIN"));

usersRouter.get("/", async (req, res, next) => {
    try {
        const { offset, limit } = getPagination(req.query);
        const q = String(req.query.q || "").trim();
        const where = q ? "WHERE username LIKE :q" : "";
        const params: any = q ? { q: `%${q}%`, limit, offset } : { limit, offset };
        const [items] = await pool.query(
            `SELECT id, username, role, created_at FROM users ${where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
            params
        );
        const [cnt] = await pool.query(
            `SELECT COUNT(*) AS total FROM users ${where}`,
            q ? { q: `%${q}%` } : {}
        );
        res.json({ items, total: (cnt as any[])[0].total });
    } catch (e) { next(e); }
});

usersRouter.post("/", async (req, res, next) => {
    try {
        const { username, password, role } = req.body ?? {};
        if (!username || !password) return res.status(400).json({ message: "username & password required" });
        const hash = await bcrypt.hash(password, 12);
        const [r] = await pool.query(
            "INSERT INTO users (username, password_hash, role) VALUES (:u, :p, :r)",
            { u: username, p: hash, r: role === "ADMIN" ? "ADMIN" : "USER" }
        );
        res.json({ id: (r as any).insertId, username, role: role === "ADMIN" ? "ADMIN" : "USER" });
    } catch (e) { next(e); }
});

usersRouter.get("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [rows] = await pool.query("SELECT id, username, role, created_at FROM users WHERE id = :id", { id });
        const u = (rows as any[])[0];
        if (!u) return res.status(404).json({ message: "Not found" });
        res.json(u);
    } catch (e) { next(e); }
});

usersRouter.patch("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const updates: string[] = [];
        const params: any = { id };
        if (req.body.role) { updates.push("role = :role"); params.role = req.body.role === "ADMIN" ? "ADMIN" : "USER"; }
        if (req.body.password) { updates.push("password_hash = :ph"); params.ph = await bcrypt.hash(req.body.password, 12); }
        if (!updates.length) return res.json({ message: "nothing to update" });
        await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = :id`, params);
        const [rows] = await pool.query("SELECT id, username, role FROM users WHERE id = :id", { id });
        res.json((rows as any[])[0]);
    } catch (e) { next(e); }
});

usersRouter.delete("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await pool.query("DELETE FROM users WHERE id = :id", { id });
        res.json({ message: "deleted" });
    } catch (e) { next(e); }
});
