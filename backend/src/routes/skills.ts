import { Router } from "express";
import { getPool } from "../lib/db";
import { getPagination } from "../utils/pagination";
import { requireAuth, requireRole } from "../middleware/auth";

export const skillsRouter = Router();
const pool = getPool();

skillsRouter.get("/", requireAuth, async (req, res, next) => {
    try {
        const { offset, limit } = getPagination(req.query);
        const q = String(req.query.q || "").trim();
        const where = q ? "WHERE name LIKE :q" : "";
        const params: any = q ? { q: `%${q}%`, limit, offset } : { limit, offset };
        const [items] = await pool.query(
            `SELECT id, name, description, created_at FROM skill_categories ${where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
            params
        );
        const [cnt] = await pool.query(`SELECT COUNT(*) AS total FROM skill_categories ${where}`, q ? { q: `%${q}%` } : {});
        res.json({ items, total: (cnt as any[])[0].total });
    } catch (e) { next(e); }
});

skillsRouter.post("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
    try {
        const { name, description } = req.body ?? {};
        if (!name) return res.status(400).json({ message: "name required" });
        const [r] = await pool.query("INSERT INTO skill_categories (name, description) VALUES (:n, :d)", { n: name, d: description ?? null });
        const id = (r as any).insertId;
        const [rows] = await pool.query("SELECT * FROM skill_categories WHERE id = :id", { id });
        res.json((rows as any[])[0]);
    } catch (e) { next(e); }
});

skillsRouter.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await pool.query("UPDATE skill_categories SET name = :n, description = :d WHERE id = :id", {
            n: req.body.name, d: req.body.description ?? null, id
        });
        const [rows] = await pool.query("SELECT * FROM skill_categories WHERE id = :id", { id });
        res.json((rows as any[])[0]);
    } catch (e) { next(e); }
});

skillsRouter.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await pool.query("DELETE FROM skill_categories WHERE id = :id", { id });
        res.json({ message: "deleted" });
    } catch (e) { next(e); }
});
