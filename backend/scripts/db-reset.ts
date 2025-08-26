import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import { getPool } from "../src/lib/db";

async function run() {
    const pool = getPool();
    const sql = fs.readFileSync(path.join(__dirname, "..", "sql", "schema.sql"), "utf8");
    for (const statement of sql.split(/;\s*\n/).filter(Boolean)) {
        await pool.query(statement);
    }
    console.log("DB schema applied.");
    await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
