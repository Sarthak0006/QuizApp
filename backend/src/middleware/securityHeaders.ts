import { NextFunction, Request, Response } from "express";

// Extra defensive headers on top of helmet (optional tweaks)
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
}
