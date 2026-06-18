const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "db.json");

/*
 * Lưu trữ bằng file JSON — đủ dùng cho một shop quy mô nhỏ/vừa và không
 * cần cài thêm hệ quản trị cơ sở dữ liệu. Khi lượng đơn hàng lớn hơn,
 * thay các hàm dưới đây bằng truy vấn Postgres/MySQL mà không cần đổi
 * phần routes trong server.js.
 */

function readDB() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { readDB, writeDB };
