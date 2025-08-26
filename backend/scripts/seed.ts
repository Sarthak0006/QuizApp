import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { getPool } from "../src/lib/db"; // mysql2/promise pool factory

// helper: split SQL file by semicolons safely enough for our simple seed files
function splitSql(sql: string): string[] {
    // naive but effective for simple statements (no procedures)
    return sql
        .split(/;\s*(?:\r?\n|$)/g)
        .map(s => s.trim())
        .filter(Boolean);
}

async function ensureAdmin(conn: any, username: string, password: string, role = "ADMIN") {
    const hash = await bcrypt.hash(password, 12);

    // Make sure there's a UNIQUE index on users.username
    // (If your schema already has it, this is a no-op; safe to run.)
    await conn.query(
        `ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS ux_users_username (username)`
    ).catch(() => { }); // ignore if exists / old MySQL syntax

    // Insert or keep existing; update role if needed (don’t overwrite password if user exists)
    const [rows] = await conn.query(
        `SELECT id FROM users WHERE username = ? LIMIT 1`,
        [username]
    );

    if (Array.isArray(rows) && rows.length > 0) {
        await conn.query(`UPDATE users SET role = ? WHERE username = ?`, [role, username]);
        console.log(`ℹ️  Admin '${username}' already exists. Kept existing password, updated role to ${role}.`);
    } else {
        await conn.query(
            `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
            [username, hash, role]
        );
        console.log(`✅ Admin '${username}' created with password '${password}'.`);
    }
}

async function run() {
    const pool = getPool();
    const conn = await pool.getConnection();

    const ADMIN_USER = process.env.SEED_ADMIN_USER || "admin";
    const ADMIN_PASS = process.env.SEED_ADMIN_PASS || "admin123";

    try {
        await conn.beginTransaction();

        // 1) Run your SQL file (schema/skills/questions/etc.)
        const seedPath = path.join(__dirname, "..", "sql", "seed.sql");
        if (fs.existsSync(seedPath)) {
            const sql = fs.readFileSync(seedPath, "utf8");
            const statements = splitSql(sql);
            for (const stmt of statements) {
                await conn.query(stmt);
            }
            console.log(`📦 Ran ${statements.length} SQL statements from sql/seed.sql`);
        } else {
            console.log("⚠️  sql/seed.sql not found — skipping raw SQL seeding.");
        }

        // 2) Ensure admin via bcrypt
        await ensureAdmin(conn, ADMIN_USER, ADMIN_PASS, "ADMIN");

        await conn.commit();
        console.log("🎉 Seed complete.");
    } catch (e) {
        await conn.rollback();
        console.error("❌ Seed failed:", e);
        process.exit(1);
    } finally {
        conn.release();
        await pool.end();
    }
}

run();
