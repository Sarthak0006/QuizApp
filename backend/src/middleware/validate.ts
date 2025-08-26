import { NextFunction, Request, Response } from "express";

type Rule =
    | { field: string; type?: "string" | "number" | "boolean"; required?: boolean; minLen?: number; maxLen?: number }
    | { field: string; enum: readonly string[]; required?: boolean };

export function validateBody(rules: Rule[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const body = req.body ?? {};
        for (const rule of rules) {
            const val = (body as any)[(rule as any).field];

            // Required
            if ((rule as any).required && (val === undefined || val === null || val === "")) {
                return res.status(400).json({ message: `Field "${(rule as any).field}" is required` });
            }
            if (val === undefined || val === null) continue;

            // Enum
            if ("enum" in rule) {
                if (!rule.enum.includes(String(val))) {
                    return res.status(400).json({ message: `Field "${rule.field}" must be one of: ${rule.enum.join(", ")}` });
                }
                continue;
            }

            // Type
            if (rule.type) {
                const t = typeof val;
                if (rule.type === "number" && isNaN(Number(val))) {
                    return res.status(400).json({ message: `Field "${rule.field}" must be a number` });
                }
                if (rule.type !== "number" && t !== rule.type) {
                    return res.status(400).json({ message: `Field "${rule.field}" must be ${rule.type}` });
                }
            }

            // Length
            if (rule.minLen && String(val).length < rule.minLen) {
                return res.status(400).json({ message: `Field "${rule.field}" must have length >= ${rule.minLen}` });
            }
            if (rule.maxLen && String(val).length > rule.maxLen) {
                return res.status(400).json({ message: `Field "${rule.field}" must have length <= ${rule.maxLen}` });
            }
        }
        next();
    };
}
