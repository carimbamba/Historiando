"use strict";

require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const pool = require("./client");

async function migrate() {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("[migrate] No migration files found.");
    return;
  }

  const client = await pool.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`[migrate] Running ${file}...`);
      await client.query(sql);
      console.log(`[migrate] ✅ ${file} completed.`);
    }
    console.log("[migrate] ✅ All migrations completed successfully.");
  } catch (err) {
    console.error("[migrate] ❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

