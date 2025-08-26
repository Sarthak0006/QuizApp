import { RequestHandler } from "express";

// Wrap async route handlers to forward errors to errorHandler
export const asyncHandler = (fn: (...args: any[]) => Promise<any>): RequestHandler =>
    (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
