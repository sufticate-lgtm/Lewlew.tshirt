require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const { readDB, writeDB } = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";
const SIZES = ["S", "M", "L", "XL", "XXL"];

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

function genOrderCode() {
  return "XI" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
}

function requireAdmin(req, res, next) {
  const supplied = req.header("x-admin-password");
  if (!supplied || supplied !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu quản trị hoặc chưa đăng nhập." });
  }
  next();
}

/* ---------------- PUBLIC: catalog ---------------- */

app.get("/api/shirt-colors", (req, res) => {
  const db = readDB();
  res.json(db.shirtColors);
});

app.get("/api/print-colors", (req, res) => {
  const db = readDB();
  res.json(db.printColors);
});

app.get("/api/designs", (req, res) => {
  const db = readDB();
  res.json(db.designs);
});

app.get("/api/settings", (req, res) => {
  const db = readDB();
  res.json(db.settings);
});

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
    const shirt = db.shirtColors.find((c) => c.id === raw.shirtColorId);
    const design = db.designs.find((d) => d.id === raw.designId);
    const primary = db.printColors.find((c) => c.id === raw.colors?.primary);
    const secondary = db.printColors.find((c) => c.id === raw.colors?.secondary);
    const size = SIZES.includes(raw.size) ? raw.size : null;
    const qty = Number.isInteger(raw.qty) && raw.qty > 0 ? raw.qty : null;

    if (!shirt || !design || !primary || !secondary || !size || !qty) {
      return res.status(400).json({ error: "Một sản phẩm trong đơn hàng có dữ liệu không hợp lệ." });
    }

    // Giá luôn được tính lại ở server, không tin vào giá gửi từ client.
    const unitPrice = db.settings.basePrice + (size === "XXL" ? db.settings.xxlSurcharge : 0);

    validatedItems.push({
      shirtColorId: shirt.id,
      designId: design.id,
      colors: { primary: primary.id, secondary: secondary.id },
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
  const db = readDB();
  const order = db.orders.find((o) => o.code === req.params.code.toUpperCase());
  if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng với mã này." });
  res.json(order);
});

/* ---------------- ADMIN ---------------- */

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: "Sai mật khẩu." });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.orders);
});

app.patch("/api/admin/orders/:code", requireAdmin, (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.code === req.params.code.toUpperCase());
  if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "Thiếu trạng thái mới." });
  order.status = status;
  writeDB(db);
  res.json(order);
});

app.post("/api/admin/shirt-colors", requireAdmin, (req, res) => {
  const db = readDB();
  const { name, hex } = req.body || {};
  if (!name || !hex) return res.status(400).json({ error: "Thiếu tên hoặc mã màu." });
  const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || crypto.randomUUID();
  db.shirtColors.push({ id, name, hex });
  writeDB(db);
  res.status(201).json(db.shirtColors);
});

app.delete("/api/admin/shirt-colors/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.shirtColors = db.shirtColors.filter((c) => c.id !== req.params.id);
  writeDB(db);
  res.json(db.shirtColors);
});

app.post("/api/admin/print-colors", requireAdmin, (req, res) => {
  const db = readDB();
  const { name, hex } = req.body || {};
  if (!name || !hex) return res.status(400).json({ error: "Thiếu tên hoặc mã màu." });
  const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || crypto.randomUUID();
  db.printColors.push({ id, name, hex });
  writeDB(db);
  res.status(201).json(db.printColors);
});

app.delete("/api/admin/print-colors/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.printColors = db.printColors.filter((c) => c.id !== req.params.id);
  writeDB(db);
  res.json(db.printColors);
});

app.post("/api/admin/designs", requireAdmin, (req, res) => {
  const db = readDB();
  const { name, svg, defaultColors } = req.body || {};
  if (!name || !svg || !defaultColors?.primary || !defaultColors?.secondary) {
    return res.status(400).json({ error: "Thiếu tên, mã SVG, hoặc màu mặc định." });
  }
  if (!svg.includes("__PRIMARY__") || !svg.includes("__SECONDARY__")) {
    return res.status(400).json({ error: "Mã SVG cần chứa __PRIMARY__ và __SECONDARY__ để khách có thể đổi màu." });
  }
  const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || crypto.randomUUID();
  db.designs.push({ id, name, svg, defaultColors });
  writeDB(db);
  res.status(201).json(db.designs);
});

app.delete("/api/admin/designs/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.designs = db.designs.filter((d) => d.id !== req.params.id);
  writeDB(db);
  res.json(db.designs);
});

/* ---------------- SERVE THE BUILT FRONTEND (single deployable service) ---------------- */

const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
app.use(express.static(CLIENT_DIST));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ error: "Không tìm thấy." });
});

app.listen(PORT, () => {
  console.log(`Xưởng.In đang chạy tại http://localhost:${PORT}`);
});
