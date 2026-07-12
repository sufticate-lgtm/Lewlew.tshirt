require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const crypto   = require("crypto");
const path     = require("path");
const fs       = require("fs");
const { execFile } = require("child_process");
const multer   = require("multer");
const sharp    = require("sharp");
const { readDB, writeDB, UPLOADS_DIR } = require("./db");

const app  = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";
const SIZES = ["S","M","L","XL","XXL"];
const PYTHON = process.env.PYTHON_BIN || "python3";
const EXTRACT_SCRIPT = path.join(__dirname, "extract_psd.py");

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());
app.use("/seed-uploads", express.static(path.join(__dirname,"seed-assets","uploads")));
app.use("/uploads",      express.static(UPLOADS_DIR));

/* ── Multer ─────────────────────────────────────────────── */
const upload = multer({
  storage: multer.diskStorage({
    destination: (_,__,cb) => cb(null, UPLOADS_DIR),
    filename:    (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomUUID() + (ext || ".png"));
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB cho PSD
  fileFilter: (_, file, cb) => {
    const ok = /\.(png|jpg|jpeg|tif|tiff|webp|psd|psb)$/i.test(file.originalname)
            || ["image/png","image/jpeg","image/tiff","image/webp",
                "application/octet-stream","image/vnd.adobe.photoshop"].includes(file.mimetype);
    cb(ok ? null : new Error("Chỉ nhận file ảnh hoặc PSD/TIFF."), ok);
  },
});

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
function getAdminInfo(req) {
  const pw = req.header("x-admin-password")||req.body?.password||"";
  const db = readDB();
  const admins = db.admins || [];
  const admin = admins.find(a=>a.password===pw);
  if (admin) return admin;
  if (pw===ADMIN_PASSWORD) return {id:"owner",name:"Owner",role:"owner"};
  return null;
}
function requireAdmin(req,res,next) {
  const admin = getAdminInfo(req);
  if(!admin) return res.status(401).json({error:"Sai mật khẩu quản trị."});
  next();
}
function deleteFile(url) {
  if (url && url.startsWith("/uploads/"))
    fs.unlink(path.join(UPLOADS_DIR, path.basename(url)),()=>{});
}
function urlFromPath(p) { return "/uploads/" + path.basename(p); }

/* ── PUBLIC: catalog ────────────────────────────────────── */
app.get("/api/shirt-colors", (_,res) => res.json(readDB().shirtColors));
app.get("/api/ink-colors",   (_,res) => res.json(readDB().inkColors));
app.get("/api/designs",      (_,res) => res.json(readDB().designs.filter(d=>d.status==='public')));
app.get("/api/settings",     (_,res) => res.json(readDB().settings));

/* ── PUBLIC: orders ─────────────────────────────────────── */
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
    const layerChoices = [];
    for (const lc of (raw.layerColors||[])) {
      const layer = design.layers.find(l=>l.id===lc.layerId);
      const ink   = db.inkColors.find(c=>c.id===lc.inkColorId);
      if (!layer||!ink) return res.status(400).json({error:"Màu mực không hợp lệ."});
      layerChoices.push({layerId:layer.id,layerName:layer.name,png:layer.png,
        inkColorId:ink.id,inkName:ink.name,inkHex:ink.hex});
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

/* ── ADMIN: auth + orders ───────────────────────────────── */
app.post("/api/admin/login",(req,res)=>{
  const pw=(req.body||{}).password||"";
  const db=readDB();
  const admins=db.admins||[];
  const admin=admins.find(a=>a.password===pw);
  if(admin) return res.json({ok:true,name:admin.name,id:admin.id,role:admin.role||"staff"});
  if(pw===ADMIN_PASSWORD) return res.json({ok:true,name:"Owner",id:"owner",role:"owner"});
  res.status(401).json({error:"Sai mật khẩu."});
});

function requireOwner(req,res,next) {
  const admin = getAdminInfo(req);
  if(!admin) return res.status(401).json({error:"Sai mật khẩu quản trị."});
  if(admin.role && admin.role!=='owner') return res.status(403).json({error:"Chỉ Owner mới có quyền này."});
  next();
}

/* Quan ly tai khoan admin */
app.get("/api/admin/accounts",requireAdmin,(req,res)=>{
  const db=readDB();
  const admins=(db.admins||[]).map(a=>({id:a.id,name:a.name})); // khong tra password
  res.json(admins);
});
app.post("/api/admin/accounts",requireOwner,(req,res)=>{
  const db=readDB();
  const{name,password,role}=req.body||{};
  if(!name||!password) return res.status(400).json({error:"Cần tên và mật khẩu."});
  if(!db.admins) db.admins=[];
  const id="admin_"+Date.now();
  db.admins.push({id,name,password,role:role||"staff"});
  writeDB(db);
  res.status(201).json({ok:true,id,name,role:role||"staff"});
});
app.delete("/api/admin/accounts/:id",requireOwner,(req,res)=>{
  const db=readDB();
  if(!db.admins) return res.status(404).json({error:"Không tìm thấy."});
  db.admins=db.admins.filter(a=>a.id!==req.params.id);
  writeDB(db);
  res.json({ok:true});
});
app.get("/api/admin/orders",requireAdmin,(req,res)=>res.json(readDB().orders));
app.patch("/api/admin/orders/:code",requireAdmin,(req,res)=>{
  const db=readDB();
  const o=db.orders.find(o=>o.code===req.params.code.toUpperCase());
  if(!o) return res.status(404).json({error:"Không tìm thấy đơn hàng."});
  if(!req.body?.status) return res.status(400).json({error:"Thiếu trạng thái."});
  o.status=req.body.status; writeDB(db); res.json(o);
});

/* ── ADMIN: settings ────────────────────────────────────── */
app.patch("/api/admin/settings",requireOwner,(req,res)=>{
  const db=readDB(); Object.assign(db.settings,req.body||{}); writeDB(db); res.json(db.settings);
});
app.post("/api/admin/settings/ruler",requireOwner,upload.single("photo"),
  async(req,res)=>{
    const db=readDB(); const field=req.body?.field||"rulerPhoto";
    if(!req.file) return res.status(400).json({error:"Thiếu file."});
    const fp=await ensurePng(req.file.path);
    if(db.settings[field]) deleteFile(db.settings[field]);
    db.settings[field]=urlFromPath(fp); writeDB(db); res.json(db.settings);
  }
);

/* ── ADMIN: shirt colors ────────────────────────────────── */
app.post("/api/admin/shirt-colors",requireAdmin,upload.fields([{name:"photo",maxCount:1},{name:"photoBack",maxCount:1}]),
  async(req,res)=>{
    const db=readDB(); const{name,hex}=req.body||{};
    const front = req.files?.photo?.[0];
    if(!name||!hex||!front) return res.status(400).json({error:"Cần tên, hex và ảnh mặt trước."});
    const fp=await ensurePng(front.path);
    const back = req.files?.photoBack?.[0];
    const fpBack = back ? await ensurePng(back.path) : null;
    db.shirtColors.push({id:slugify(name),name,hex,photo:urlFromPath(fp),photoBack:fpBack?urlFromPath(fpBack):null});
    writeDB(db); res.status(201).json(db.shirtColors);
  }
);
app.patch("/api/admin/shirt-colors/:id",requireAdmin,
  upload.fields([{name:"photo",maxCount:1},{name:"photoBack",maxCount:1}]),
  async(req,res)=>{
    const db=readDB(); const c=db.shirtColors.find(c=>c.id===req.params.id);
    if(!c) return res.status(404).json({error:"Không tìm thấy."});
    if(req.body?.hex)  c.hex=req.body.hex;
    if(req.body?.name) c.name=req.body.name;
    const front=req.files?.photo?.[0];
    if(front){ if(c.photo&&c.photo.startsWith('/uploads/'))deleteFile(c.photo); const fp=await ensurePng(front.path); c.photo=urlFromPath(fp); }
    const back=req.files?.photoBack?.[0];
    if(back){ if(c.photoBack)deleteFile(c.photoBack); const fp=await ensurePng(back.path); c.photoBack=urlFromPath(fp); }
    if(req.body?.removeBack==="1"){ if(c.photoBack)deleteFile(c.photoBack); c.photoBack=null; }
    writeDB(db); res.json(db.shirtColors);
  }
);
app.delete("/api/admin/shirt-colors/:id",requireAdmin,(req,res)=>{
  const db=readDB(); const c=db.shirtColors.find(c=>c.id===req.params.id);
  if(c) deleteFile(c.photo);
  db.shirtColors=db.shirtColors.filter(c=>c.id!==req.params.id);
  writeDB(db); res.json(db.shirtColors);
});

/* ── ADMIN: ink colors ──────────────────────────────────── */
app.post("/api/admin/ink-colors",requireAdmin,(req,res)=>{
  const db=readDB(); const{name,hex}=req.body||{};
  if(!name||!hex) return res.status(400).json({error:"Thiếu tên hoặc màu."});
  db.inkColors.push({id:slugify(name),name,hex}); writeDB(db); res.status(201).json(db.inkColors);
});
app.patch("/api/admin/ink-colors/:id",requireAdmin,(req,res)=>{
  const db=readDB(); const c=db.inkColors.find(c=>c.id===req.params.id);
  if(!c) return res.status(404).json({error:"Không tìm thấy màu mực."});
  if(req.body?.name) c.name=req.body.name;
  if(req.body?.hex)  c.hex=req.body.hex;
  writeDB(db); res.json(db.inkColors);
});
app.delete("/api/admin/ink-colors/:id",requireAdmin,(req,res)=>{
  const db=readDB(); db.inkColors=db.inkColors.filter(c=>c.id!==req.params.id);
  writeDB(db); res.json(db.inkColors);
});

/* ── ADMIN: designs CRUD ────────────────────────────────── */
app.get("/api/admin/designs",requireAdmin,(req,res)=>res.json(readDB().designs));
app.post("/api/admin/designs",requireAdmin,(req,res)=>{
  const db=readDB(); const{name}=req.body||{};
  if(!name) return res.status(400).json({error:"Thiếu tên mẫu."});
  db.designs.push({id:slugify(name),name,layers:[],printArea:{cx:0.50,cy:0.37,w:0.32}});
  writeDB(db); res.status(201).json(db.designs);
});
app.patch("/api/admin/designs/:id",requireAdmin,(req,res)=>{
  const db=readDB(); const d=db.designs.find(d=>d.id===req.params.id);
  if(!d) return res.status(404).json({error:"Không tìm thấy mẫu."});
  if(req.body?.name) d.name=req.body.name;
  if(req.body?.printArea) d.printArea={...d.printArea,...req.body.printArea};
  if(req.body?.printZones) d.printZones=req.body.printZones;
  if(req.body?.status) d.status=req.body.status;
  if(req.body?.status) d.status=req.body.status;
  if(req.body?.printAreaBack!==undefined){
    d.printAreaBack = req.body.printAreaBack
      ? {...(d.printAreaBack||{cx:0.50,cy:0.37,w:0.32}),...req.body.printAreaBack}
      : null;
  }
  writeDB(db); res.json(db.designs);
});
app.delete("/api/admin/designs/:id",requireAdmin,(req,res)=>{
  const db=readDB(); const d=db.designs.find(d=>d.id===req.params.id);
  if(d) d.layers.forEach(l=>deleteFile(l.png));
  db.designs=db.designs.filter(d=>d.id!==req.params.id);
  writeDB(db); res.json(db.designs);
});

/* Duplicate design */
app.post("/api/admin/designs/:id/duplicate",requireAdmin,async(req,res)=>{
  const db=readDB();
  const src=db.designs.find(d=>d.id===req.params.id);
  const newId=src.id+"-copy-"+Date.now().toString(36);
  const newDesign={...JSON.parse(JSON.stringify(src)),id:newId,name:src.name+" (copy)"};
  db.designs.push(newDesign);
  writeDB(db);res.status(201).json(db.designs);
});

/* ── ADMIN: design layers (manual PNG upload) ───────────── */
app.post("/api/admin/designs/:id/layers",requireAdmin,upload.single("png"),
  async(req,res)=>{
    const db=readDB(); const d=db.designs.find(d=>d.id===req.params.id);
    if(!d) return res.status(404).json({error:"Không tìm thấy mẫu."});
    const{name,defaultInkId,zoneId,pendingZones}=req.body||{};
    if(!name||!req.file) return res.status(400).json({error:"Thiếu tên layer và file PNG."});
    const fp=await ensurePng(req.file.path);
    const side=(req.body?.side)||"front";
    d.layers.push({id:"l"+Date.now(),name,png:urlFromPath(fp),defaultInkId:defaultInkId||"black",side,zoneId:zoneId||null});
    if(pendingZones){try{d.printZones=JSON.parse(pendingZones);}catch(e){}}

    // Tu dong cap nhat ti le printArea/printAreaBack theo kich thuoc PNG dau tien
    try {
      const meta = await sharp(fp).metadata();
      if(meta.width && meta.height) {
        const imgRatio = meta.height / meta.width;
        // Chi cap nhat neu day la layer dau tien cua design
        if(d.layers.length === 1) {
          const pa = side==='back' ? (d.printAreaBack||{cx:0.50,cy:0.37,w:0.32}) : d.printArea;
          const newH = pa.w * imgRatio;
          if(side==='back') {
            d.printAreaBack = {...pa, h: newH};
          } else {
            d.printArea = {...d.printArea, h: newH};
          }
        }
      }
    } catch(e) { /* khong update ratio neu loi */ }

    writeDB(db); res.status(201).json(db.designs);
  }
);
/* PATCH layer: xu ly ca JSON (doi ten/side/ink) va multipart (thay PNG) */
app.patch("/api/admin/designs/:id/layers/:lid",requireAdmin,
  (req,res,next) => {
    const ct = req.headers['content-type']||'';
    if(ct.includes('multipart')) return upload.single('png')(req,res,next);
    next(); // JSON request: express.json() da xu ly roi
  },
  async(req,res)=>{
    const db=readDB(); const d=db.designs.find(d=>d.id===req.params.id);
    if(!d) return res.status(404).json({error:"Không tìm thấy mẫu."});
    const l=d.layers.find(l=>l.id===req.params.lid);
    if(!l) return res.status(404).json({error:"Không tìm thấy layer."});
    if(req.body?.name) l.name=req.body.name;
    if(req.body?.defaultInkId) l.defaultInkId=req.body.defaultInkId;
    if(req.body?.side) l.side=req.body.side;
    if(req.body?.zoneId) l.zoneId=req.body.zoneId;
    if(req.file){ 
      if(l.png&&l.png.startsWith('/uploads/'))deleteFile(l.png);
      const fp=await ensurePng(req.file.path); l.png=urlFromPath(fp);
    }
    writeDB(db); res.json(db.designs);
  }
);
/* Doi thu tu layers */
app.patch("/api/admin/designs/:id/layer-order",requireAdmin,(req,res)=>{
  const db=readDB(); const d=db.designs.find(d=>d.id===req.params.id);
  if(!d) return res.status(404).json({error:"Không tìm thấy mẫu."});
  const {order} = req.body||{};
  if(!Array.isArray(order)) return res.status(400).json({error:"Thiếu order."});
  // Sap xep lai layers theo mang id moi
  const layerMap = Object.fromEntries(d.layers.map(l=>[l.id,l]));
  d.layers = order.map(id=>layerMap[id]).filter(Boolean);
  writeDB(db); res.json(db.designs);
});

app.delete("/api/admin/designs/:id/layers/:lid",requireAdmin,(req,res)=>{
  const db=readDB(); const d=db.designs.find(d=>d.id===req.params.id);
  if(!d) return res.status(404).json({error:"Không tìm thấy mẫu."});
  const l=d.layers.find(l=>l.id===req.params.lid);
  if(l) deleteFile(l.png);
  d.layers=d.layers.filter(l=>l.id!==req.params.lid);
  writeDB(db); res.json(db.designs);
});

/* ── ADMIN: PSD AUTO-EXTRACT ─────────────────────────────── */
app.post("/api/admin/psd-extract",
  requireAdmin,
  upload.single("psd"),
  (req,res) => {
    if(!req.file) return res.status(400).json({error:"Thiếu file PSD."});

    const psdPath = req.file.path;
    const outDir  = UPLOADS_DIR;
    const maxPx   = 1500; // max canvas size per dimension

    execFile(PYTHON, [EXTRACT_SCRIPT, psdPath, outDir, String(maxPx)],
      { timeout: 120_000, maxBuffer: 10*1024*1024 },
      (err, stdout, stderr) => {
        // Xoa file PSD goc sau khi xu ly
        fs.unlink(psdPath, ()=>{});

        if(err) {
          console.error("PSD extract error:", err.message, stderr);
          return res.status(500).json({error: "Lỗi khi xử lý PSD: " + (stderr||err.message)});
        }

        let result;
        try { result = JSON.parse(stdout); }
        catch(e) { return res.status(500).json({error:"Python script trả về dữ liệu không hợp lệ."}); }

        if(!result.ok) return res.status(500).json({error: result.error||"Lỗi không xác định."});

        // Chuyen duong dan tuyet doi → URL tuong doi
        result.layers = result.layers.map(l => ({
          ...l,
          url: urlFromPath(l.file),
        }));

        res.json(result);
      }
    );
  }
);

/* ── ADMIN: tao design tu ket qua PSD extract ───────────── */
app.post("/api/admin/designs-from-psd",requireAdmin,(req,res)=>{
  const db=readDB();
  const { name, layers, printArea } = req.body||{};
  if(!name||!Array.isArray(layers)||!layers.length)
    return res.status(400).json({error:"Thiếu tên hoặc layers."});

  const design = {
    id: slugify(name),
    name,
    layers: layers.map((l,i)=>({
      id: "l"+(Date.now()+i),
      name: l.name,
      png: l.url,
      defaultInkId: l.defaultInkId || (db.inkColors[0]?.id) || "black",
    })),
    printArea: printArea || {cx:0.50,cy:0.37,w:0.32},
  };

  // Tranh trung id
  if(db.designs.find(d=>d.id===design.id)) design.id += "-" + Date.now();
  db.designs.push(design);
  writeDB(db);
  res.status(201).json(db.designs);
});

/* ── SPA fallback ───────────────────────────────────────── */
app.use("/api",(req,res)=>res.status(404).json({error:"Không tìm thấy."}));
app.use((err,req,res,next)=>res.status(400).json({error:err.message||"Có lỗi xảy ra."}));

const CLIENT_DIST=path.join(__dirname,"..","client","dist");
app.use(express.static(CLIENT_DIST));
app.get("*",(req,res)=>res.sendFile(path.join(CLIENT_DIST,"index.html")));

app.listen(PORT,()=>console.log(`Lewlew Tshirt chạy tại http://localhost:${PORT}`));

// DRIVE SYNC
const ds=require("./drive-sync");ds.sync().catch(console.error);setInterval(()=>ds.sync().catch(console.error),60000);
