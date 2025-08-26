import { NextFunction, Request, Response } from "express";

/**
 * Lightweight in-memory rate limiter (IP-based)
 * windowMs: time window in ms
 * limit: max requests per window
 */
export function rateLimit({ windowMs = 60_000, limit = 100 }: { windowMs?: number; limit?: number; }) {
    const hits = new Map<string, { count: number; reset: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
        const now = Date.now();
        const rec = hits.get(ip);

        if (!rec || rec.reset < now) {
            hits.set(ip, { count: 1, reset: now + windowMs });
            return next();
        }

        rec.count += 1;
        if (rec.count > limit) {
            res.setHeader("Retry-After", Math.ceil((rec.reset - now) / 1000));
            return res.status(429).json({ message: "Too many requests" });
        }
        return next();
    };
}
