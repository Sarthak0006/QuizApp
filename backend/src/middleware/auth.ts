import { NextFunction, Request, Response } from "express";
import { verifyAccess } from "../utils/jwt";

declare global {
    namespace Express {
        interface Request {
            user?: { sub: number; username: string; role: "USER" | "ADMIN"; jti?: string };
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.auth;
    if (!token) return res.status(401).json({ message: "Unauthenticated" });
    try {
        req.user = verifyAccess(token);
        return next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

export function requireRole(role: "USER" | "ADMIN") {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ message: "Unauthenticated" });
        const rank = { USER: 1, ADMIN: 2 } as const;
        if (rank[req.user.role] < rank[role]) return res.status(403).json({ message: "Forbidden" });
        return next();
    };
}
