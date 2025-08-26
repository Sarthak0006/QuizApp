import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { authRouter } from "../routes/auth";
import { usersRouter } from "../routes/users";
import { skillsRouter } from "../routes/skills";
import { questionsRouter } from "../routes/questions";
import { quizRouter } from "../routes/quiz";
import { reportsRouter } from "../routes/reports";
import { errorHandler } from "./error";

// NEW middlewares
import { securityHeaders } from "../middleware/securityHeaders";
import { rateLimit } from "../middleware/rateLimit";
import { attachCsrfToken, requireCsrf } from "../middleware/csrf";

export const app = express();

const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(securityHeaders);
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(rateLimit({ windowMs: 60_000, limit: 200 })); // 200 req/min/IP
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Attach CSRF cookie for browser apps
app.use(attachCsrfToken);

// Health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/api/auth/refresh", requireCsrf);

// Apply requireCsrf only to state-changing routes:
app.use("/api/auth/logout", requireCsrf);
app.use("/api/users", requireCsrf);
app.use("/api/skills", requireCsrf);
app.use("/api/questions", requireCsrf);
app.use("/api/quiz", requireCsrf);

// Routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/reports", reportsRouter);

// Error last
app.use(errorHandler);
