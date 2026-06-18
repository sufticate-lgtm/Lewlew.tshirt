require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { readDB, writeDB, UPLOADS_DIR } = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";
const SIZES = ["S", "M", "L", "XL", "XXL"];

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

/* Ảnh mẫu có sẵn (đi kèm code, luôn tồn tại) + ảnh admin tự tải lên (cần ổ đĩa bền để không mất) */
app.use("/seed-uploads", express.static(path.join(__dirname, "seed-assets", "uploads")));
app.use("/uploads", express.static(UPLOADS_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + (path.extname(file.originalname) || ".jpg")),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Chỉ nhận file ảnh."));
    cb(null, true);
  },
});

function genOrderCode() {
  return "XI" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
}
function slugify(name) {
  return (
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || crypto.randomUUID()
  );
}
function requireAdmin(req, res, next) {
  const supplied = req.header("x-admin-password");
  if (!supplied || supplied !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu quản trị hoặc chưa đăng nhập." });
  }
  next();
}

/* ---------------- PUBLIC: catalog ---------------- */

app.get("/api/shirt-colors", (req, res) => res.json(readDB().shirtColors));
app.get("/api/designs", (req, res) => res.json(readDB().designs));
app.get("/api/settings", (req, res) => res.json(readDB().settings));

/* ---------------- PUBLIC: orders ---------------- */

app.post("/api/orders", (req, res) => {
  const db = readDB();
  const { items, customer, payment } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Đơn hàng cần có ít nhất một sản phẩm." });
  }
  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return res.status(400).json({ error: "Thiếu thông tin người nhận (họ tên, số điện thoại, địa chỉ)." });
  }
  if (!["cod", "bank", "momo"].includes(payment)) {
    return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ." });
  }

  const validatedItems = [];
  for (const raw of items) {
    const design = db.designs.find((d) => d.id === raw.designId);
    const variant = design?.variants.find((v) => v.id === raw.variantId);
    const shirt = db.shirtColors.find((c) => c.id === raw.shirtColorId);
    const photo = variant?.photos?.[raw.shirtColorId];
    const size = SIZES.includes(raw.size) ? raw.size : null;
    const qty = Number.isInteger(raw.qty) && raw.qty > 0 ? raw.qty : null;

    if (!design || !variant || !shirt || !photo || !size || !qty) {
      return res.status(400).json({ error: "Một sản phẩm trong đơn hàng không còn tồn tại hoặc thiếu ảnh cho lựa chọn này." });
    }

    const unitPrice = db.settings.basePrice + (size === "XXL" ? db.settings.xxlSurcharge : 0);

    validatedItems.push({
      designId: design.id,
      designName: design.name,
      variantId: variant.id,
      variantName: variant.name,
      shirtColorId: shirt.id,
      shirtName: shirt.name,
      photo,
      size,
      qty,
      unitPrice,
    });
  }

  const total = validatedItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

  const order = {
    code: genOrderCode(),
    items: validatedItems,
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address,
    },
    payment,
    total,
    status: "Đang xử lý",
    createdAt: new Date().toISOString(),
  };

  db.orders.unshift(order);
  writeDB(db);
  res.status(201).json(order);
});

app.get("/api/orders/:code", (req, res) => {
  const order = readDB().orders.find((o) => o.code === req.params.code.toUpperCase());
  if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng với mã này." });
  res.json(order);
});

/* ---------------- ADMIN: auth + orders ---------------- */

app.post("/api/admin/login", (req, res) => {
  if ((req.body || {}).password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: "Sai mật khẩu." });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => res.json(readDB().orders));

app.patch("/api/admin/orders/:code", requireAdmin, (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.code === req.params.code.toUpperCase());
  if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
  if (!req.body?.status) return res.status(400).json({ error: "Thiếu trạng thái mới." });
  order.status = req.body.status;
  writeDB(db);
  res.json(order);
});

/* ---------------- ADMIN: shirt colors ---------------- */

app.post("/api/admin/shirt-colors", requireAdmin, (req, res) => {
  const db = readDB();
  const { name, hex } = req.body || {};
  if (!name || !hex) return res.status(400).json({ error: "Thiếu tên hoặc mã màu." });
  db.shirtColors.push({ id: slugify(name), name, hex });
  writeDB(db);
  res.status(201).json(db.shirtColors);
});

app.delete("/api/admin/shirt-colors/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.shirtColors = db.shirtColors.filter((c) => c.id !== req.params.id);
  writeDB(db);
  res.json(db.shirtColors);
});

/* ---------------- ADMIN: designs, ink variants, photos ---------------- */

app.post("/api/admin/designs", requireAdmin, (req, res) => {
  const db = readDB();
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Thiếu tên mẫu in." });
  db.designs.push({ id: slugify(name), name, variants: [] });
  writeDB(db);
  res.status(201).json(db.designs);
});

app.delete("/api/admin/designs/:designId", requireAdmin, (req, res) => {
  const db = readDB();
  db.designs = db.designs.filter((d) => d.id !== req.params.designId);
  writeDB(db);
  res.json(db.designs);
});

app.post("/api/admin/designs/:designId/variants", requireAdmin, (req, res) => {
  const db = readDB();
  const design = db.designs.find((d) => d.id === req.params.designId);
  if (!design) return res.status(404).json({ error: "Không tìm thấy mẫu in." });
  const { name, swatchHex } = req.body || {};
  if (!name || !swatchHex) return res.status(400).json({ error: "Thiếu tên hoặc màu đại diện cho biến thể." });
  design.variants.push({ id: slugify(name), name, swatchHex, photos: {} });
  writeDB(db);
  res.status(201).json(db.designs);
});

app.delete("/api/admin/designs/:designId/variants/:variantId", requireAdmin, (req, res) => {
  const db = readDB();
  const design = db.designs.find((d) => d.id === req.params.designId);
  if (!design) return res.status(404).json({ error: "Không tìm thấy mẫu in." });
  design.variants = design.variants.filter((v) => v.id !== req.params.variantId);
  writeDB(db);
  res.json(db.designs);
});

app.post(
  "/api/admin/designs/:designId/variants/:variantId/photo",
  requireAdmin,
  upload.single("photo"),
  (req, res) => {
    const db = readDB();
    const design = db.designs.find((d) => d.id === req.params.designId);
    const variant = design?.variants.find((v) => v.id === req.params.variantId);
    const shirtColorId = req.body?.shirtColorId;
    const shirt = db.shirtColors.find((c) => c.id === shirtColorId);

    if (!design || !variant || !shirt) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: "Không tìm thấy mẫu in / biến thể / màu áo." });
    }
    if (!req.file) return res.status(400).json({ error: "Thiếu file ảnh." });

    const oldUrl = variant.photos[shirtColorId];
    if (oldUrl && oldUrl.startsWith("/uploads/")) {
      fs.unlink(path.join(UPLOADS_DIR, path.basename(oldUrl)), () => {});
    }
    variant.photos[shirtColorId] = `/uploads/${req.file.filename}`;
    writeDB(db);
    res.status(201).json(db.designs);
  }
);

app.delete("/api/admin/designs/:designId/variants/:variantId/photo/:shirtColorId", requireAdmin, (req, res) => {
  const db = readDB();
  const design = db.designs.find((d) => d.id === req.params.designId);
  const variant = design?.variants.find((v) => v.id === req.params.variantId);
  if (!design || !variant) return res.status(404).json({ error: "Không tìm thấy mẫu in / biến thể." });

  const url = variant.photos[req.params.shirtColorId];
  if (url && url.startsWith("/uploads/")) {
    fs.unlink(path.join(UPLOADS_DIR, path.basename(url)), () => {});
  }
  delete variant.photos[req.params.shirtColorId];
  writeDB(db);
  res.json(db.designs);
});

app.use("/api", (req, res) => res.status(404).json({ error: "Không tìm thấy." }));
app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Có lỗi xảy ra." });
});

/* ---------------- SERVE THE BUILT FRONTEND (single deployable service) ---------------- */

const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
app.use(express.static(CLIENT_DIST));
app.get("*", (req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));

app.listen(PORT, () => {
  console.log(`Xưởng.In đang chạy tại http://localhost:${PORT}`);
});
