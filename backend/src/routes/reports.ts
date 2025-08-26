import { Router } from "express";
import { getPool } from "../lib/db";
import { requireAuth } from "../middleware/auth";

export const reportsRouter = Router();
const pool = getPool();

function rangeClause(q: any) {
    const now = new Date();
    const period = String(q.period || "").toLowerCase(); // "week" | "month"
    let start: Date | undefined;
    let end: Date | undefined;
    if (q.from) start = new Date(String(q.from));
    if (q.to) end = new Date(String(q.to));
    if (!start && period === "week") {
        start = new Date(now); start.setDate(now.getDate() - 7);
    }
    if (!start && period === "month") {
        start = new Date(now); start.setMonth(now.getMonth() - 1);
    }
    let clause = "";
    const params: any[] = [];
    if (start) { clause += " AND qa.started_at >= ?"; params.push(start); }
    if (end) { clause += " AND qa.started_at <= ?"; params.push(end); }
    return { clause, params };
}

// user-wise performance per skill
reportsRouter.get("/user/:userId/performance", requireAuth, async (req, res, next) => {
    try {
        const me = req.user!;
        const userId = Number(req.params.userId);
        if (me.role !== "ADMIN" && me.sub !== userId) return res.status(403).json({ message: "Forbidden" });

        const { clause, params } = rangeClause(req.query);
        const [rows] = await pool.query(
            `SELECT qa.skill_id AS skillId, sc.name AS skill,
              SUM(qa.score) AS sumScore, SUM(qa.total) AS sumTotal
         FROM quiz_attempts qa
         JOIN skill_categories sc ON sc.id = qa.skill_id
        WHERE qa.user_id = ? ${clause}
        GROUP BY qa.skill_id, sc.name
        ORDER BY sc.name ASC`,
            [userId, ...params]
        );
        const data = (rows as any[]).map(r => ({
            skillId: r.skillId,
            skill: r.skill,
            avgPercent: r.sumTotal ? Math.round((r.sumScore / r.sumTotal) * 100) : 0,
            attemptsTotal: r.sumTotal
        }));
        res.json({ userId, data });
    } catch (e) { next(e); }
});

// skill gaps: user avg vs global avg per skill
reportsRouter.get("/user/:userId/skill-gaps", requireAuth, async (req, res, next) => {
    try {
        const me = req.user!;
        const userId = Number(req.params.userId);
        if (me.role !== "ADMIN" && me.sub !== userId) return res.status(403).json({ message: "Forbidden" });

        const { clause, params } = rangeClause(req.query);

        const [userAgg] = await pool.query(
            `SELECT qa.skill_id AS skillId, SUM(qa.score) AS s, SUM(qa.total) AS t
         FROM quiz_attempts qa WHERE qa.user_id = ? ${clause}
        GROUP BY qa.skill_id`,
            [userId, ...params]
        );
        const [globalAgg] = await pool.query(
            `SELECT qa.skill_id AS skillId, SUM(qa.score) AS s, SUM(qa.total) AS t
         FROM quiz_attempts qa WHERE 1=1 ${clause}
        GROUP BY qa.skill_id`,
            params
        );
        const mapG = new Map((globalAgg as any[]).map(g => [g.skillId, g]));
        const [skills] = await pool.query(
            `SELECT id, name FROM skill_categories WHERE id IN (${(userAgg as any[]).map(() => " ? ").join(",") || "NULL"})`,
            (userAgg as any[]).map((u: any) => u.skillId)
        );

        const nameById = new Map((skills as any[]).map((s: any) => [s.id, s.name]));
        const data = (userAgg as any[]).map(u => {
            const g = mapG.get(u.skillId);
            const uPct = u.t ? (u.s / u.t) * 100 : 0;
            const gPct = g && g.t ? (g.s / g.t) * 100 : 0;
            return {
                skillId: u.skillId,
                skill: nameById.get(u.skillId) || "",
                userAvg: Math.round(uPct),
                globalAvg: Math.round(gPct),
                gap: Math.round(uPct - gPct)
            };
        }).sort((a, b) => a.gap - b.gap);

        res.json({ userId, data });
    } catch (e) { next(e); }
});
