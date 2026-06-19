require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const crypto  = require("crypto");
const path    = require("path");
const fs      = require("fs");
const multer  = require("multer");
const sharp   = require("sharp");
const { readDB, writeDB, UPLOADS_DIR } = require("./db");

const app  = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";
const SIZES = ["S","M","L","XL","XXL"];

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());
app.use("/seed-uploads", express.static(path.join(__dirname,"seed-assets","uploads")));
app.use("/uploads", express.static(UPLOADS_DIR));

/* ── Multer: chấp nhận PNG, JPG, TIFF, WEBP ────────────────── */
const upload = multer({
  storage: multer.diskStorage({
    destination: (_,__,cb) => cb(null, UPLOADS_DIR),
    filename: (_,file,cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomUUID() + (ext || ".png"));
    },
  }),
  limits: { fileSize: 30*1024*1024 },
  fileFilter: (_, file, cb) => {
    const ok = ["image/png","image/jpeg","image/tiff","image/tif","image/webp",
                "image/x-tiff","application/octet-stream"].includes(file.mimetype)
               || /\.(png|jpg|jpeg|tif|tiff|webp)$/i.test(file.originalname);
    cb(ok ? null : new Error("Chỉ nhận file ảnh (PNG/JPG/TIFF/WEBP)."), ok);
  },
});

/* Sau khi upload: nếu là TIFF → convert sang PNG trong suốt */
async function ensurePng(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".tif" || ext === ".tiff") {
    const pngPath = filePath.replace(/\.(tif|tiff)$/i, ".png");
    await sharp(filePath).png().toFile(pngPath);
    fs.unlink(filePath, ()=>{});
    return pngPath;
  }
  return filePath;
}

function genOrderCode() {
  return "XI" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
}
function slugify(s) {
  return (s||"").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")
    .replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || crypto.randomUUID();
}
function requireAdmin(req,res,next) {
  if (req.header("x-admin-password") !== ADMIN_PASSWORD)
    return res.status(401).json({error:"Sai mật khẩu quản trị."});
  next();
}
function deleteFile(url) {
  if (url && url.startsWith("/uploads/"))
    fs.unlink(path.join(UPLOADS_DIR, path.basename(url)),()=>{});
}
function urlFromPath(filePath) {
  return "/uploads/" + path.basename(filePath);
}

/* ── PUBLIC: catalog ────────────────────────────────────────── */
app.get("/api/shirt-colors", (_,res) => res.json(readDB().shirtColors));
app.get("/api/ink-colors",   (_,res) => res.json(readDB().inkColors));
app.get("/api/designs",      (_,res) => res.json(readDB().designs));
app.get("/api/settings",     (_,res) => res.json(readDB().settings));

/* ── PUBLIC: orders ─────────────────────────────────────────── */
app.post("/api/orders", (req,res) => {
  const db = readDB();
  const { items, customer, payment } = req.body||{};
  if (!Array.isArray(items)||!items.length)
    return res.status(400).json({error:"Đơn hàng cần ít nhất một sản phẩm."});
  if (!customer?.name||!customer?.phone||!customer?.address)
    return res.status(400).json({error:"Thiếu thông tin người nhận."});
  if (!["cod","bank","momo"].includes(payment))
    return res.status(400).json({error:"Phương thức thanh toán không hợp lệ."});

  const validated = [];
  for (const raw of items) {
    const shirt  = db.shirtColors.find(c=>c.id===raw.shirtColorId);
    const design = db.designs.find(d=>d.id===raw.designId);
    const size   = SIZES.includes(raw.size)?raw.size:null;
    const qty    = Number.isInteger(raw.qty)&&raw.qty>0?raw.qty:null;
    if (!shirt||!design||!size||!qty)
      return res.status(400).json({error:"Sản phẩm không hợp lệ."});
    // Validate layers
    const layerChoices = [];
    for (const lc of (raw.layerColors||[])) {
      const layer = design.layers.find(l=>l.id===lc.layerId);
      const ink   = db.inkColors.find(c=>c.id===lc.inkColorId);
      if (!layer||!ink) return res.status(400).json({error:"Màu mực không hợp lệ."});
      layerChoices.push({layerId:layer.id, layerName:layer.name, png:layer.png, inkColorId:ink.id, inkName:ink.name, inkHex:ink.hex});
    }
    validated.push({
      designId:design.id, designName:design.name, printArea:design.printArea,
      shirtColorId:shirt.id, shirtName:shirt.name, shirtPhoto:shirt.photo,
      layerColors:layerChoices,
      size, qty,
      unitPrice: db.settings.basePrice + (size==="XXL"?db.settings.xxlSurcharge:0),
    });
  }
  const order = {
    code: genOrderCode(),
    items: validated,
    customer:{name:customer.name,phone:customer.phone,email:customer.email||"",address:customer.address},
    payment, total: validated.reduce((s,i)=>s+i.unitPrice*i.qty,0),
    status:"Đang xử lý", createdAt:new Date().toISOString(),
  };
  const db2=readDB(); db2.orders.unshift(order); writeDB(db2);
  res.status(201).json(order);
});

app.get("/api/orders/:code",(req,res)=>{
  const o=readDB().orders.find(o=>o.code===req.params.code.toUpperCase());
  if(!o) return res.status(404).json({error:"Không tìm thấy đơn hàng."});
  res.json(o);
});

/* ── ADMIN: auth + orders ───────────────────────────────────── */
app.post("/api/admin/login",(req,res)=>{
  if((req.body||{}).password===ADMIN_PASSWORD) return res.json({ok:true});
  res.status(401).json({error:"Sai mật khẩu."});
});
app.get("/api/admin/orders",requireAdmin,(req,res)=>res.json(readDB().orders));
app.patch("/api/admin/orders/:code",requireAdmin,(req,res)=>{
  const db=readDB();
  const o=db.orders.find(o=>o.code===req.params.code.toUpperCase());
  if(!o) return res.status(404).json({error:"Không tìm thấy đơn hàng."});
  if(!req.body?.status) return res.status(400).json({error:"Thiếu trạng thái."});
  o.status=req.body.status; writeDB(db); res.json(o);
});

/* ── ADMIN: settings (ruler images + calibration) ───────────── */
app.patch("/api/admin/settings",requireAdmin,(req,res)=>{
  const db=readDB();
  Object.assign(db.settings, req.body||{});
  writeDB(db); res.json(db.settings);
});
app.post("/api/admin/settings/ruler", requireAdmin, upload.single("photo"),
  async (req,res)=>{
    const db=readDB();
    const field = req.body?.field || "rulerPhoto"; // "rulerPhoto" | "rulerMockupPhoto"
    if(!req.file) return res.status(400).json({error:"Thiếu file ảnh."});
    const fp = await ensurePng(req.file.path);
    if(db.settings[field]) deleteFile(db.settings[field]);
    db.settings[field] = urlFromPath(fp);
    writeDB(db); res.json(db.settings);
  }
);

/* ── ADMIN: shirt colors ────────────────────────────────────── */
app.post("/api/admin/shirt-colors",requireAdmin,upload.single("photo"),
  async (req,res)=>{
    const db=readDB();
    const {name,hex}=req.body||{};
    if(!name||!hex||!req.file) return res.status(400).json({error:"Cần tên, hex và ảnh mockup."});
    const fp=await ensurePng(req.file.path);
    db.shirtColors.push({id:slugify(name),name,hex,photo:urlFromPath(fp)});
    writeDB(db); res.status(201).json(db.shirtColors);
  }
);
app.patch("/api/admin/shirt-colors/:id",requireAdmin,(req,res)=>{
  const db=readDB();
  const c=db.shirtColors.find(c=>c.id===req.params.id);
  if(!c) return res.status(404).json({error:"Không tìm thấy màu áo."});
  if(req.body?.hex) c.hex=req.body.hex;
  if(req.body?.name) c.name=req.body.name;
  writeDB(db); res.json(db.shirtColors);
});
app.delete("/api/admin/shirt-colors/:id",requireAdmin,(req,res)=>{
  const db=readDB();
  const c=db.shirtColors.find(c=>c.id===req.params.id);
  if(c) deleteFile(c.photo);
  db.shirtColors=db.shirtColors.filter(c=>c.id!==req.params.id);
  writeDB(db); res.json(db.shirtColors);
});

/* ── ADMIN: ink colors ──────────────────────────────────────── */
app.post("/api/admin/ink-colors",requireAdmin,(req,res)=>{
  const db=readDB(); const{name,hex}=req.body||{};
  if(!name||!hex) return res.status(400).json({error:"Thiếu tên hoặc mã màu."});
  db.inkColors.push({id:slugify(name),name,hex}); writeDB(db); res.status(201).json(db.inkColors);
});
app.delete("/api/admin/ink-colors/:id",requireAdmin,(req,res)=>{
  const db=readDB(); db.inkColors=db.inkColors.filter(c=>c.id!==req.params.id);
  writeDB(db); res.json(db.inkColors);
});

/* ── ADMIN: designs ─────────────────────────────────────────── */
app.get("/api/admin/designs",requireAdmin,(req,res)=>res.json(readDB().designs));
app.post("/api/admin/designs",requireAdmin,(req,res)=>{
  const db=readDB(); const{name}=req.body||{};
  if(!name) return res.status(400).json({error:"Thiếu tên mẫu."});
  db.designs.push({id:slugify(name),name,layers:[],printArea:{cx:0.50,cy:0.37,w:0.15}});
  writeDB(db); res.status(201).json(db.designs);
});
app.patch("/api/admin/designs/:designId",requireAdmin,(req,res)=>{
  const db=readDB(); const d=db.designs.find(d=>d.id===req.params.designId);
  if(!d) return res.status(404).json({error:"Không tìm thấy mẫu."});
  if(req.body?.name) d.name=req.body.name;
  if(req.body?.printArea) d.printArea={...d.printArea,...req.body.printArea};
  writeDB(db); res.json(db.designs);
});
app.delete("/api/admin/designs/:designId",requireAdmin,(req,res)=>{
  const db=readDB(); const d=db.designs.find(d=>d.id===req.params.designId);
  if(d) d.layers.forEach(l=>deleteFile(l.png));
  db.designs=db.designs.filter(d=>d.id!==req.params.designId);
  writeDB(db); res.json(db.designs);
});

/* ── ADMIN: design layers ───────────────────────────────────── */
app.post("/api/admin/designs/:designId/layers",requireAdmin,upload.single("png"),
  async(req,res)=>{
    const db=readDB(); const d=db.designs.find(d=>d.id===req.params.designId);
    if(!d) return res.status(404).json({error:"Không tìm thấy mẫu."});
    const{name,defaultInkId}=req.body||{};
    if(!name||!req.file) return res.status(400).json({error:"Thiếu tên layer và file PNG."});
    // Convert TIFF → PNG nếu cần
    const fp=await ensurePng(req.file.path);
    d.layers.push({id:"l"+Date.now(),name,png:urlFromPath(fp),defaultInkId:defaultInkId||"black"});
    writeDB(db); res.status(201).json(db.designs);
  }
);
app.patch("/api/admin/designs/:designId/layers/:layerId",requireAdmin,(req,res)=>{
  const db=readDB(); const d=db.designs.find(d=>d.id===req.params.designId);
  if(!d) return res.status(404).json({error:"Không tìm thấy mẫu."});
  const l=d.layers.find(l=>l.id===req.params.layerId);
  if(!l) return res.status(404).json({error:"Không tìm thấy layer."});
  if(req.body?.name) l.name=req.body.name;
  if(req.body?.defaultInkId) l.defaultInkId=req.body.defaultInkId;
  writeDB(db); res.json(db.designs);
});
app.delete("/api/admin/designs/:designId/layers/:layerId",requireAdmin,(req,res)=>{
  const db=readDB(); const d=db.designs.find(d=>d.id===req.params.designId);
  if(!d) return res.status(404).json({error:"Không tìm thấy mẫu."});
  const l=d.layers.find(l=>l.id===req.params.layerId);
  if(l) deleteFile(l.png);
  d.layers=d.layers.filter(l=>l.id!==req.params.layerId);
  writeDB(db); res.json(db.designs);
});

app.use("/api",(req,res)=>res.status(404).json({error:"Không tìm thấy."}));
app.use((err,req,res,next)=>res.status(400).json({error:err.message||"Có lỗi xảy ra."}));

const CLIENT_DIST=path.join(__dirname,"..","client","dist");
app.use(express.static(CLIENT_DIST));
app.get("*",(req,res)=>res.sendFile(path.join(CLIENT_DIST,"index.html")));

app.listen(PORT,()=>console.log(`Xưởng.In chạy tại http://localhost:${PORT}`));
