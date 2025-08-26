import { Router } from "express";
import { getPool } from "../lib/db";
import { getPagination } from "../utils/pagination";
import { requireAuth, requireRole } from "../middleware/auth";

export const questionsRouter = Router();
const pool = getPool();

questionsRouter.get("/", requireAuth, async (req, res, next) => {
    try {
        const { offset, limit } = getPagination(req.query);
        const skillId = req.query.skillId ? Number(req.query.skillId) : undefined;
        const where = skillId ? "WHERE skill_id = :sid" : "";
        const [items] = await pool.query(
            `SELECT id, skill_id, text, options_json, correct_option, created_at
         FROM questions ${where}
         ORDER BY created_at DESC
         LIMIT :limit OFFSET :offset`,
            skillId ? { sid: skillId, limit, offset } : { limit, offset }
        );
        const [cnt] = await pool.query(
            `SELECT COUNT(*) AS total FROM questions ${where}`,
            skillId ? { sid: skillId } : {}
        );
        res.json({ items, total: (cnt as any[])[0].total });
    } catch (e) { next(e); }
});

questionsRouter.post("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
    try {
        const { skillId, text, options, correctOption } = req.body ?? {};
        if (!skillId || !text || !options || !correctOption) return res.status(400).json({ message: "missing fields" });
        if (!options[correctOption]) return res.status(400).json({ message: "correctOption must exist in options" });

        const [r] = await pool.query(
            "INSERT INTO questions (skill_id, text, options_json, correct_option) VALUES (:sid, :t, CAST(:o AS JSON), :c)",
            { sid: Number(skillId), t: text, o: JSON.stringify(options), c: String(correctOption) }
        );
        const id = (r as any).insertId;
        const [rows] = await pool.query("SELECT * FROM questions WHERE id = :id", { id });
        res.json((rows as any[])[0]);
    } catch (e) { next(e); }
});

questionsRouter.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const updates: string[] = [];
        const params: any = { id };
        if (req.body.text !== undefined) { updates.push("text = :t"); params.t = req.body.text; }
        if (req.body.options !== undefined) { updates.push("options_json = CAST(:o AS JSON)"); params.o = JSON.stringify(req.body.options); }
        if (req.body.correctOption !== undefined) { updates.push("correct_option = :c"); params.c = String(req.body.correctOption); }
        if (!updates.length) return res.json({ message: "nothing to update" });
        await pool.query(`UPDATE questions SET ${updates.join(", ")} WHERE id = :id`, params);
        const [rows] = await pool.query("SELECT * FROM questions WHERE id = :id", { id });
        res.json((rows as any[])[0]);
    } catch (e) { next(e); }
});

questionsRouter.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
    try {
        await pool.query("DELETE FROM questions WHERE id = :id", { id: Number(req.params.id) });
        res.json({ message: "deleted" });
    } catch (e) { next(e); }
});
