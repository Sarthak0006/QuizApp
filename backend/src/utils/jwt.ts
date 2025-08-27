// auth-tokens.ts
import jwt from "jsonwebtoken";
import type { Response } from "express";
import crypto from "crypto";

/** ENV & defaults */
const ACCESS_TOKEN_SECRET: jwt.Secret =
    process.env.ACCESS_TOKEN_SECRET ?? "dev-access";
const REFRESH_TOKEN_SECRET: jwt.Secret =
    process.env.REFRESH_TOKEN_SECRET ?? "dev-refresh";

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? "900s";   // 15m
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL ?? "14d";  // 14d

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? "localhost";
const COOKIE_SECURE = (process.env.COOKIE_SECURE ?? "false") === "true";
const COOKIE_SAMESITE: "strict" | "lax" | "none" =
    (process.env.COOKIE_SAMESITE as "strict" | "lax" | "none") ?? "strict";

/** Your app payload */
export type AppJwtPayload = {
    sub: number;
    username: string;
    role: "USER" | "ADMIN";
    jti?: string; // refresh rotation id
};

/** ---- Type guard to narrow verify() result ---- */
function isAppJwtPayload(v: unknown): v is AppJwtPayload {
    if (!v || typeof v !== "object") return false;
    const o = v as Record<string, unknown>;
    const hasSub = typeof o.sub === "number";
    const hasUsername = typeof o.username === "string" && o.username.length > 0;
    const hasRole = o.role === "USER" || o.role === "ADMIN";
    return hasSub && hasUsername && hasRole;
}

/** ---- Signing helpers ---- */
export function signAccess(payload: AppJwtPayload): string {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: secondsFromTTL(ACCESS_TOKEN_TTL),
    });
}

export function signRefresh(payload: Omit<AppJwtPayload, "jti">): string {
    const jti = crypto.randomBytes(12).toString("hex");
    return jwt.sign({ ...payload, jti }, REFRESH_TOKEN_SECRET, {
        expiresIn: secondsFromTTL(REFRESH_TOKEN_TTL),
    });
}

/** ---- Verify helpers (narrowed safely) ---- */
export function verifyAccess(token: string): AppJwtPayload {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    if (typeof decoded === "string" || !isAppJwtPayload(decoded)) {
        throw new Error("Invalid access token payload");
    }
    return decoded; // now AppJwtPayload by guard
}

export function verifyRefresh(token: string): AppJwtPayload {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    if (typeof decoded === "string" || !isAppJwtPayload(decoded)) {
        throw new Error("Invalid refresh token payload");
    }
    return decoded;
}

/** ---- Cookie helpers ---- */
export function setAccessCookie(res: Response, token: string): void {
    res.cookie("auth", token, {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: COOKIE_SAMESITE,
        domain: COOKIE_DOMAIN,
        path: "/",
        maxAge: msFromTTL(ACCESS_TOKEN_TTL),
    });
}

export function setRefreshCookie(res: Response, token: string): void {
    res.cookie("refresh", token, {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: COOKIE_SAMESITE,
        domain: COOKIE_DOMAIN,
        path: "/",
        maxAge: msFromTTL(REFRESH_TOKEN_TTL),
    });
}

export function clearAuthCookies(res: Response): void {
    const opts = {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: COOKIE_SAMESITE as "strict" | "lax" | "none",
        domain: COOKIE_DOMAIN,
        path: "/",
    };
    res.clearCookie("auth", opts);
    res.clearCookie("refresh", opts);
}

/** ---- TTL utilities ---- */
export function msFromTTL(ttl: string): number {
    const m = ttl.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!m) return 3_600_000; // 1h default
    const n = Number(m[1]);
    const u = m[2];
    if (u === "ms") return n;
    if (u === "s") return n * 1_000;
    if (u === "m") return n * 60_000;
    if (u === "h") return n * 3_600_000;
    if (u === "d") return n * 86_400_000;
    return 3_600_000;
}

export function secondsFromTTL(ttl: string): number {
    const m = ttl.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!m) return 3_600; // 1h default
    const n = Number(m[1]);
    const u = m[2];
    if (u === "ms") return Math.max(1, Math.floor(n / 1000));
    if (u === "s") return n;
    if (u === "m") return n * 60;
    if (u === "h") return n * 3_600;
    if (u === "d") return n * 86_400;
    return 3_600;
}

/** ---- Tip ----
 * On jsonwebtoken v9, REMOVE @types/jsonwebtoken to avoid overload clashes:
 *   pnpm remove @types/jsonwebtoken
 */
