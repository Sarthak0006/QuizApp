import { Router } from "express";
import { getPool } from "../lib/db";
import { requireAuth } from "../middleware/auth";
import { getPagination } from "../utils/pagination";

export const quizRouter = Router();
const pool = getPool();

// Submit attempt
// body: { skillId, answers: [{questionId, selected}] }
quizRouter.post("/attempts", requireAuth, async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const userId = req.user!.sub;
        const { skillId, answers } = req.body ?? {};
        if (!skillId || !Array.isArray(answers) || !answers.length) {
            return res.status(400).json({ message: "skillId and answers[] required" });
        }

        // fetch questions for given ids + skill check
        const ids = answers.map((a: any) => Number(a.questionId));
        const [qs] = await conn.query(
            `SELECT id, correct_option FROM questions WHERE id IN (${ids.map(() => "?").join(",")}) AND skill_id = ?`,
            [...ids, Number(skillId)]
        );
        const list = qs as any[];
        if (list.length !== ids.length) return res.status(400).json({ message: "invalid question set" });

        // score
        let score = 0;
        const map = new Map<number, string>(list.map(q => [q.id, q.correct_option]));
        const rows = answers.map((a: any) => {
            const picked = String(a.selected || "");
            const ok = picked === map.get(Number(a.questionId));
            if (ok) score++;
            return { qid: Number(a.questionId), sel: picked, ok: ok ? 1 : 0 };
        });

        await conn.beginTransaction();
        const [ar] = await conn.query(
            "INSERT INTO quiz_attempts (user_id, skill_id, score, total, submitted_at) VALUES (?, ?, ?, ?, NOW())",
            [userId, Number(skillId), score, list.length]
        );
        const attemptId = (ar as any).insertId;

        if (rows.length) {
            const values = rows.map(() => "(?, ?, ?, ?)").join(",");
            const flat = rows.flatMap(r => [attemptId, r.qid, r.sel, r.ok]);
            await conn.query(
                `INSERT INTO quiz_answers (attempt_id, question_id, selected, is_correct) VALUES ${values}`,
                flat
            );
        }
        await conn.commit();

        res.json({ attempt: { id: attemptId, userId, skillId: Number(skillId), score, total: list.length } });
    } catch (e) {
        await (conn as any).rollback?.();
        next(e);
    } finally {
        conn.release();
    }
});

// List attempts (me; admin can filter any userId)
quizRouter.get("/attempts", requireAuth, async (req, res, next) => {
    try {
        const { offset, limit } = getPagination(req.query);
        const me = req.user!;
        const userId = req.query.userId ? Number(req.query.userId) : undefined;

        let where = "WHERE 1=1";
        const params: any[] = [];
        if (userId) {
            if (me.role !== "ADMIN" && me.sub !== userId) return res.status(403).json({ message: "Forbidden" });
            where += " AND qa.user_id = ?"; params.push(userId);
        } else if (me.role !== "ADMIN") {
            where += " AND qa.user_id = ?"; params.push(me.sub);
        }

        const [items] = await pool.query(
            `SELECT qa.id, qa.user_id AS userId, qa.skill_id AS skillId, sc.name AS skill,
              qa.score, qa.total, qa.started_at AS startedAt, qa.submitted_at AS submittedAt
         FROM quiz_attempts qa
         JOIN skill_categories sc ON sc.id = qa.skill_id
         ${where}
         ORDER BY qa.started_at DESC
         LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const [cnt] = await pool.query(
            `SELECT COUNT(*) AS total
         FROM quiz_attempts qa
         ${where}`,
            params
        );
        res.json({ items, total: (cnt as any[])[0].total });
    } catch (e) { next(e); }
});
