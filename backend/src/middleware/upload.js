"use strict";

const multer = require("multer");

/**
 * Configure multer to use RAM (memoryStorage) up to 2MB,
 * accepting only Excel or CSV files.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const validMimes = [
    "text/csv", // CSV
    "application/vnd.ms-excel", // XLS
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // XLSX
  ];

  if (validMimes.includes(file.mimetype) || file.originalname.endsWith(".csv") || file.originalname.endsWith(".xlsx")) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo não permitido. Apenas planilhas CSV ou Excel."), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
  fileFilter,
});

module.exports = upload;
