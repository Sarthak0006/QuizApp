import jwt from "jsonwebtoken";
import { Response } from "express";
import crypto from "crypto";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "dev-access";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "dev-refresh";
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "900s";    // 15m
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "14d";   // 14d

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || "localhost";
const COOKIE_SECURE = (process.env.COOKIE_SECURE || "false") === "true";

export type JwtPayload = { sub: number; username: string; role: "USER" | "ADMIN"; jti?: string };

// ---- Access token ----
export function signAccess(payload: JwtPayload) {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}
export function verifyAccess(token: string): JwtPayload {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
}

// ---- Refresh token (stateless) ----
export function signRefresh(payload: Omit<JwtPayload, "jti">) {
    const jti = crypto.randomBytes(12).toString("hex"); // rotation id
    return jwt.sign({ ...payload, jti }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}
export function verifyRefresh(token: string): JwtPayload {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
}

// ---- Cookie helpers ----
export function setAccessCookie(res: Response, token: string) {
    res.cookie("auth", token, {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: "strict",
        domain: COOKIE_DOMAIN,
        path: "/",
        maxAge: msFromTTL(ACCESS_TOKEN_TTL)
    });
}
export function setRefreshCookie(res: Response, token: string) {
    res.cookie("refresh", token, {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: "strict",
        domain: COOKIE_DOMAIN,
        path: "/",
        maxAge: msFromTTL(REFRESH_TOKEN_TTL)
    });
}
export function clearAuthCookies(res: Response) {
    res.clearCookie("auth", { path: "/", domain: COOKIE_DOMAIN });
    res.clearCookie("refresh", { path: "/", domain: COOKIE_DOMAIN });
}

// utility: parse "15m"/"900s"/"14d"
function msFromTTL(ttl: string) {
    const m = ttl.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!m) return 3600_000;
    const n = Number(m[1]); const u = m[2];
    if (u === "ms") return n;
    if (u === "s") return n * 1000;
    if (u === "m") return n * 60_000;
    if (u === "h") return n * 3_600_000;
    if (u === "d") return n * 86_400_000;
    return 3600_000;
}
