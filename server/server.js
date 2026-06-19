require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const crypto   = require("crypto");
const path     = require("path");
const fs       = require("fs");
const multer   = require("multer");
const { readDB, writeDB, UPLOADS_DIR } = require("./db");

const app  = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";
const SIZES = ["S", "M", "L", "XL", "XXL"];

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

// Anh seed (theo code) + anh admin tu tai len (theo disk)
app.use("/seed-uploads", express.static(path.join(__dirname, "seed-assets", "uploads")));
app.use("/uploads",      express.static(UPLOADS_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename:    (req, file, cb) => cb(null, crypto.randomUUID() + (path.extname(file.originalname) || ".png")),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Chỉ nhận file ảnh."));
    cb(null, true);
  },
});

function genOrderCode() {
  return "XI" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
}
function slugify(s) {
  return (s || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || crypto.randomUUID();
}
function requireAdmin(req, res, next) {
  if (req.header("x-admin-password") !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Sai mật khẩu quản trị." });
  next();
}
function deleteFile(url) {
  if (url && url.startsWith("/uploads/"))
    fs.unlink(path.join(UPLOADS_DIR, path.basename(url)), () => {});
}

/* ── PUBLIC: catalog ─────────────────────────────────────────── */
app.get("/api/shirt-colors", (req, res) => res.json(readDB().shirtColors));
app.get("/api/ink-colors",   (req, res) => res.json(readDB().inkColors));
app.get("/api/designs",      (req, res) => res.json(readDB().designs));
app.get("/api/settings",     (req, res) => res.json(readDB().settings));

/* ── PUBLIC: orders ──────────────────────────────────────────── */
app.post("/api/orders", (req, res) => {
  const db = readDB();
  const { items, customer, payment } = req.body || {};

  if (!Array.isArray(items) || !items.length)
    return res.status(400).json({ error: "Đơn hàng cần có ít nhất một sản phẩm." });
  if (!customer?.name || !customer?.phone || !customer?.address)
    return res.status(400).json({ error: "Thiếu thông tin người nhận." });
  if (!["cod","bank","momo"].includes(payment))
    return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ." });

  const validated = [];
  for (const raw of items) {
    const shirt  = db.shirtColors.find(c => c.id === raw.shirtColorId);
    const ink    = db.inkColors.find(c => c.id === raw.inkColorId);
    const design = db.designs.find(d => d.id === raw.designId);
    const size   = SIZES.includes(raw.size) ? raw.size : null;
    const qty    = Number.isInteger(raw.qty) && raw.qty > 0 ? raw.qty : null;
    if (!shirt || !ink || !design || !size || !qty)
      return res.status(400).json({ error: "Một sản phẩm trong đơn hàng có dữ liệu không hợp lệ." });

    const unitPrice = db.settings.basePrice + (size === "XXL" ? db.settings.xxlSurcharge : 0);
    validated.push({
      designId: design.id, designName: design.name, designPng: design.png,
      shirtColorId: shirt.id, shirtName: shirt.name, shirtPhoto: shirt.photo,
      inkColorId: ink.id, inkName: ink.name, inkHex: ink.hex,
      size, qty, unitPrice,
    });
  }

  const order = {
    code: genOrderCode(),
    items: validated,
    customer: { name: customer.name, phone: customer.phone, email: customer.email || "", address: customer.address },
    payment, total: validated.reduce((s,i) => s + i.unitPrice * i.qty, 0),
    status: "Đang xử lý", createdAt: new Date().toISOString(),
  };
  const db2 = readDB(); db2.orders.unshift(order); writeDB(db2);
  res.status(201).json(order);
});

app.get("/api/orders/:code", (req, res) => {
  const order = readDB().orders.find(o => o.code === req.params.code.toUpperCase());
  if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
  res.json(order);
});

/* ── ADMIN: auth + orders ────────────────────────────────────── */
app.post("/api/admin/login", (req, res) => {
  if ((req.body||{}).password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: "Sai mật khẩu." });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => res.json(readDB().orders));

app.patch("/api/admin/orders/:code", requireAdmin, (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.code === req.params.code.toUpperCase());
  if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
  if (!req.body?.status) return res.status(400).json({ error: "Thiếu trạng thái." });
  order.status = req.body.status;
  writeDB(db); res.json(order);
});

/* ── ADMIN: shirt colors (tên + hex + ảnh mockup) ───────────── */
app.post("/api/admin/shirt-colors",
  requireAdmin, upload.single("photo"),
  (req, res) => {
    const db = readDB();
    const { name, hex } = req.body || {};
    if (!name || !hex || !req.file)
      return res.status(400).json({ error: "Cần có tên màu, mã hex và ảnh mockup." });
    db.shirtColors.push({ id: slugify(name), name, hex, photo: `/uploads/${req.file.filename}` });
    writeDB(db); res.status(201).json(db.shirtColors);
  }
);

app.delete("/api/admin/shirt-colors/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const c = db.shirtColors.find(c => c.id === req.params.id);
  if (c) deleteFile(c.photo);
  db.shirtColors = db.shirtColors.filter(c => c.id !== req.params.id);
  writeDB(db); res.json(db.shirtColors);
});

/* ── ADMIN: ink colors (bảng màu mực toàn cục) ──────────────── */
app.post("/api/admin/ink-colors", requireAdmin, (req, res) => {
  const db = readDB();
  const { name, hex } = req.body || {};
  if (!name || !hex) return res.status(400).json({ error: "Thiếu tên hoặc mã màu." });
  db.inkColors.push({ id: slugify(name), name, hex });
  writeDB(db); res.status(201).json(db.inkColors);
});

app.delete("/api/admin/ink-colors/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.inkColors = db.inkColors.filter(c => c.id !== req.params.id);
  writeDB(db); res.json(db.inkColors);
});

/* ── ADMIN: designs (file PNG màu đen) ──────────────────────── */
app.post("/api/admin/designs",
  requireAdmin, upload.single("png"),
  (req, res) => {
    const db = readDB();
    const { name } = req.body || {};
    if (!name || !req.file)
      return res.status(400).json({ error: "Cần có tên mẫu và file PNG." });
    db.designs.push({ id: slugify(name), name, png: `/uploads/${req.file.filename}` });
    writeDB(db); res.status(201).json(db.designs);
  }
);

app.delete("/api/admin/designs/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const d = db.designs.find(d => d.id === req.params.id);
  if (d) deleteFile(d.png);
  db.designs = db.designs.filter(d => d.id !== req.params.id);
  writeDB(db); res.json(db.designs);
});

/* ── ERROR + SPA ─────────────────────────────────────────────── */
app.use("/api", (req, res) => res.status(404).json({ error: "Không tìm thấy." }));
app.use((err, req, res, next) => res.status(400).json({ error: err.message || "Có lỗi xảy ra." }));

const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
app.use(express.static(CLIENT_DIST));
app.get("*", (req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));

app.listen(PORT, () => console.log(`Xưởng.In chạy tại http://localhost:${PORT}`));
