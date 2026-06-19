const fs = require("fs");
const path = require("path");

const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, "data");
const DB_PATH     = path.join(STORAGE_DIR, "db.json");
const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads");
const SEED_DB_PATH = path.join(__dirname, "seed-db.json");

const SEED = JSON.parse(fs.readFileSync(SEED_DB_PATH, "utf-8"));
const CURRENT_SCHEMA_VERSION = SEED.schemaVersion;

function ensureReady() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  let needsReseed = !fs.existsSync(DB_PATH);
  if (!needsReseed) {
    try {
      const existing = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      if (existing.schemaVersion !== CURRENT_SCHEMA_VERSION) needsReseed = true;
    } catch (e) { needsReseed = true; }
  }
  if (needsReseed) fs.copyFileSync(SEED_DB_PATH, DB_PATH);
}

function readDB()       { ensureReady(); return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")); }
function writeDB(data)  { ensureReady(); fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8"); }

module.exports = { readDB, writeDB, UPLOADS_DIR, STORAGE_DIR };
