import { NextFunction, Request, Response } from "express";
import crypto from "crypto";

const isProd = (process.env.NODE_ENV || "development") === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || "localhost";

// Attach a CSRF token cookie for browser apps (double-submit cookie)
export function attachCsrfToken(req: Request, res: Response, next: NextFunction) {
    // Only set if not present
    if (!req.cookies?.["XSRF-TOKEN"]) {
        const token = crypto.randomBytes(20).toString("hex");
        res.cookie("XSRF-TOKEN", token, {
            httpOnly: false, // must be readable by frontend JS to send header
            secure: isProd,
            sameSite: "none",
            domain: COOKIE_DOMAIN,
            path: "/",
            maxAge: 60 * 60 * 1000
        });
    }
    next();
}

// Enforce on state-changing methods if using cookie-based auth
export function requireCsrf(req: Request, res: Response, next: NextFunction) {
    const method = req.method.toUpperCase();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return next();

    const header = req.get("x-xsrf-token");
    const cookie = req.cookies?.["XSRF-TOKEN"];
    if (!header || !cookie || header !== cookie) {
        return res.status(403).json({ message: "CSRF token invalid" });
    }
    next();
}
