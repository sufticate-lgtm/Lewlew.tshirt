const fs = require("fs");
const path = require("path");

/*
 * STORAGE_DIR là nơi lưu db.json và toàn bộ ảnh do admin tải lên.
 *
 * - Khi chạy trên máy của bạn: không cần đặt biến môi trường gì, dữ liệu
 *   nằm trong server/data (đã có sẵn trong .gitignore, không bị đẩy lên GitHub).
 * - Khi deploy thật và muốn dữ liệu (đơn hàng, ảnh) không biến mất sau mỗi lần
 *   restart: gắn một Persistent Disk trên Render và đặt biến môi trường
 *   STORAGE_DIR=/data (xem BAT-DAU-O-DAY.md, phần "Khi bạn sẵn sàng bán hàng thật").
 */
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, "data");
const DB_PATH = path.join(STORAGE_DIR, "db.json");
const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads");
const SEED_DB_PATH = path.join(__dirname, "seed-db.json");

function ensureReady() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.copyFileSync(SEED_DB_PATH, DB_PATH);
  }
}

function readDB() {
  ensureReady();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDB(data) {
  ensureReady();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { readDB, writeDB, UPLOADS_DIR, STORAGE_DIR };
