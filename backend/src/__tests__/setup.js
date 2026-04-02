require("dotenv").config({ path: require('path').resolve(__dirname, "../../.env") });
const pool = require("../db/client");

global.afterAll(async () => {
  // Clean up database tables to avoid conflicts for subsequent test files
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE usuarios CASCADE;");
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
  // Close the DB pool so Jest exits gracefully
  await pool.end();
});
