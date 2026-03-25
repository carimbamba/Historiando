"use strict";

require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const pool = require("./client");

async function migrate() {
  const sqlPath = path.join(__dirname, "migrations", "001_create_tables.sql");
  const sql     = fs.readFileSync(sqlPath, "utf8");

  const client = await pool.connect();
  try {
    console.log("[migrate] Running migration...");
    await client.query(sql);
    console.log("[migrate] ✅ Migration completed successfully.");
  } catch (err) {
    console.error("[migrate] ❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
