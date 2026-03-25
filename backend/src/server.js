"use strict";

require("dotenv").config();

const app  = require("./app");
const port = parseInt(process.env.PORT || "3001", 10);

const server = app.listen(port, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   Historiando API                    ║
  ║   http://localhost:${port}              ║
  ║   ENV: ${process.env.NODE_ENV || "development"}               ║
  ╚══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[server] SIGTERM received — shutting down gracefully");
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[server] SIGINT received — shutting down gracefully");
  server.close(() => process.exit(0));
});
