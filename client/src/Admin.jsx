import { useEffect, useState, useCallback } from "react";
import { Trash2, Loader2, LogOut, Upload, ChevronDown, ChevronRight, Layers } from "lucide-react";
import {
  adminLogin, adminGetOrders, adminUpdateOrderStatus,
  adminUpdateSettings, adminUploadRuler,
  getShirtColors,  adminAddShirtColor, adminPatchShirtColor, adminDeleteShirtColor,
  getInkColors,    adminAddInkColor,   adminDeleteInkColor,
  getDesigns,      adminAddDesign,     adminPatchDesign, adminDeleteDesign,
  adminAddLayer,   adminPatchLayer,    adminDeleteLayer,  adminReorderLayers,
  adminPatchLayerFull, adminPatchShirtColorFull, adminPatchInkColor,
  adminSetPrintAreaBack,
  adminGetAccounts, adminAddAccount, adminDeleteAccount,
  adminExtractPsd, adminCreateDesignFromPsd,
  getSettings,
} from "../api";
import ColorEyedropper  from "../components/ColorEyedropper";
import DesignPositioner from "../components/DesignPositioner";
import { formatVND } from "../utils";

const PW_KEY = "ll_admin_pw";
const ORDER_STATUSES = ["Đang xử lý","Đang in","Đã giao","Hoàn tất","Đã hủy"];

/* ══════════════════════════════════════════════════════════ */
export default function Admin() {
  const [password,   setPassword]   = useState(()=>localStorage.getItem(PW_KEY)||"");
  const [loggedIn,   setLoggedIn]   = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [checking,   setChecking]   = useState(true);

  useEffect(()=>{
    if(!password){setChecking(false);return;}
    adminLogin(password)
      .then(info=>{
        localStorage.setItem('ll_admin_role', info.role||'staff');
        localStorage.setItem('ll_admin_name', info.name||'');
        setLoggedIn(true);
      })
      .catch(()=>{localStorage.removeItem(PW_KEY);setPassword("");})
      .finally(()=>setChecking(false));
  },[password]);

  async function handleLogin(e){
    e.preventDefault();setLoginError(null);
    try{
      const info = await adminLogin(loginInput);
      localStorage.setItem(PW_KEY,loginInput);
      localStorage.setItem('ll_admin_role', info.role||'staff');
      localStorage.setItem('ll_admin_name', info.name||'');
      setPassword(loginInput);setLoggedIn(true);
    }catch(e){setLoginError(e.message);}
  }

  if(checking) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang kiểm tra...</div>;
  if(!loggedIn) return(
    <div className="xi-admin-login">
      <h1 className="xi-title">Đăng Nhập Quản Trị</h1>
      {loginError && <div className="xi-error">{loginError}</div>}
      <form onSubmit={handleLogin} className="xi-field">
        <label>Mật khẩu quản trị</label>
        <input type="password" value={loginInput} onChange={e=>setLoginInput(e.target.value)} autoFocus/>
        <button type="submit" className="xi-btn-primary" style={{marginTop:14,justifyContent:"center"}}>Đăng nhập</button>
      </form>
    </div>
  );
  const role = localStorage.getItem('ll_admin_role')||'staff';
  const adminName = localStorage.getItem('ll_admin_name')||'';
  return <Dashboard password={password} role={role} adminName={adminName}
    onLogout={()=>{localStorage.removeItem(PW_KEY);localStorage.removeItem('ll_admin_role');localStorage.removeItem('ll_admin_name');setPassword("");setLoggedIn(false);}}/>;
}

function Dashboard({password,role,adminName,onLogout}){
  const [tab,setTab]=useState("orders");
  const isOwner = role==="owner";
  // Nhan vien khong thay tab Cai dat va Tai khoan
  const tabs = [["orders","Đơn hàng"],["shirts","Màu áo"],["inks","Màu mực"],["designs","Hình in"],
    ...(isOwner?[["settings","Cài đặt"],["accounts","Tài khoản"]]:[])];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h1 className="xi-title" style={{marginBottom:0}}>Trang Quản Trị</h1>
          {adminName&&<div style={{fontSize:12,color:"#8a8576",marginTop:2}}>
            Xin chào, <strong>{adminName}</strong>
            {isOwner&&<span style={{marginLeft:6,background:"var(--orange)",color:"#fff",
              fontSize:10,padding:"1px 6px",borderRadius:10,fontWeight:700}}>OWNER</span>}
          </div>}
        </div>
        <button className="xi-btn-secondary" onClick={onLogout}><LogOut size={16}/> Đăng xuất</button>
      </div>
      <div className="xi-tabs">
        {tabs.map(([id,label])=>(
          <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>
      {tab==="orders"   && <OrdersTab   password={password}/>}
      {tab==="shirts"   && <ShirtsTab   password={password}/>}
      {tab==="inks"     && <InksTab     password={password}/>}
      {tab==="designs"  && <DesignsTab  password={password}/>}
      {tab==="settings" && <SettingsTab password={password}/>}
      {tab==="accounts" && <AccountsTab password={password}/>}
    </div>
  );
}

/* ── Đơn hàng ──────────────────────────────────────────── */
function OrdersTab({password}){
  const [orders,setOrders]=useState(null);
  const [error,setError]=useState(null);
  function load(){adminGetOrders(password).then(setOrders).catch(e=>setError(e.message));}
  useEffect(load,[password]);
  async function changeStatus(code,status){
    try{await adminUpdateOrderStatus(password,code,status);load();}catch(e){setError(e.message);}
  }
  if(error) return <div className="xi-error">{error}</div>;
  if(!orders) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang tải...</div>;
  if(!orders.length) return <p>Chưa có đơn hàng nào.</p>;
  return(
    <div className="xi-orders-list">
      {orders.map(o=>(
        <div key={o.code} className="xi-order-card">
          <div className="xi-order-head">
            <div>
              <div className="xi-mono" style={{fontWeight:700}}>{o.code}</div>
              <div className="xi-cart-item-meta">{o.customer.name} · {o.customer.phone} · {new Date(o.createdAt).toLocaleString("vi-VN")}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <strong>{formatVND(o.total)}</strong>
              <select value={o.status} onChange={e=>changeStatus(o.code,e.target.value)}>
                {ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginTop:10,fontSize:13,color:"#6b675c"}}>
            {o.items.map((it,i)=>(
              <div key={i} style={{marginBottom:4}}>
                {it.designName} · Áo {it.shirtName} ·{" "}
                {it.layerColors?.map(lc=>(
                  <span key={lc.layerId} style={{display:"inline-flex",alignItems:"center",gap:3,marginRight:6}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:lc.inkHex,border:"1px solid #ccc",display:"inline-block"}}/>
                    {lc.inkName}
                  </span>
                ))} · {it.size} x{it.qty}
              </div>
            ))}
            <div>Địa chỉ: {o.customer.address}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Màu áo ────────────────────────────────────────────── */
function ShirtsTab({password}){
  const [list,setList]=useState(null);
  const [name,setName]=useState("");
  const [hex,setHex]=useState("#444444");
  const [file,setFile]=useState(null);
  const [previewUrl,setPreviewUrl]=useState(null);
  const [fileBack,setFileBack]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(null);
  const [editHex,setEditHex]=useState({});
  function load(){getShirtColors().then(setList).catch(e=>setError(e.message));}
  useEffect(load,[]);
  function onFileChange(f){setFile(f);if(f)setPreviewUrl(URL.createObjectURL(f));else setPreviewUrl(null);}
  async function handleAdd(e){
    e.preventDefault();if(!file)return setError("Cần chọn ảnh mockup.");
    setBusy(true);setError(null);
    try{await adminAddShirtColor(password,name,hex,file,fileBack);setName("");setFile(null);setFileBack(null);setPreviewUrl(null);load();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function handlePatchHex(id){
    const newHex=editHex[id];if(!newHex)return;
    try{await adminPatchShirtColor(password,id,{hex:newHex});load();}catch(e){setError(e.message);}
  }
  if(!list) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/></div>;
  return(
    <div>
      <p className="xi-subtitle">Tải lên ảnh mockup áo trơn (chưa có hình in). Dùng eyedropper để lấy đúng màu vải từ ảnh.</p>
      {error&&<div className="xi-error">{error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:14,marginBottom:24}}>
        {list.map(c=>(
          <div key={c.id} style={{textAlign:"center",background:"#fff",border:"2px solid var(--line)",borderRadius:8,padding:10}}>
            <div style={{position:"relative"}}>
              <img src={c.photo} alt={c.name} style={{width:"100%",height:110,objectFit:"cover",borderRadius:6,border:"2px solid var(--line)"}}/>
              <button onClick={async()=>{if(!confirm("Xoá màu này?"))return;try{await adminDeleteShirtColor(password,c.id);load();}catch(e){setError(e.message);}}}
                style={{position:"absolute",top:3,right:3,background:"rgba(0,0,0,.6)",border:"none",color:"#fff",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:14}}>×</button>
            </div>
            <div style={{marginTop:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center",marginBottom:4}}>
                <input type="color" value={editHex[c.id]||c.hex} onChange={e=>setEditHex(ev=>({...ev,[c.id]:e.target.value}))}
                  style={{width:22,height:22,border:"none",background:"none",cursor:"pointer"}}/>
                <input defaultValue={c.name} key={c.id+"n"}
                  onBlur={async e=>{if(e.target.value!==c.name)try{await adminPatchShirtColorFull(password,c.id,e.target.value,null,null,null,false);load();}catch(e2){setError(e2.message);}}}
                  style={{fontSize:12,fontWeight:600,border:"1px solid var(--line)",borderRadius:3,padding:"2px 6px",width:80,textAlign:"center"}}/>
                {editHex[c.id]&&editHex[c.id]!==c.hex&&(
                  <button onClick={()=>handlePatchHex(c.id)} style={{fontSize:11,background:"var(--ink)",color:"#fff",border:"none",borderRadius:3,padding:"2px 6px",cursor:"pointer"}}>✓</button>
                )}
              </div>
              {/* Thay ảnh mặt trước */}
              <label style={{display:"flex",alignItems:"center",gap:4,justifyContent:"center",cursor:"pointer",fontSize:10,color:"var(--orange)"}}>
                <Upload size={10}/> Đổi ảnh trước
                <input type="file" accept="image/*" style={{display:"none"}}
                  onChange={async e=>{if(!e.target.files[0])return;try{await adminPatchShirtColorFull(password,c.id,null,null,e.target.files[0],null,false);load();}catch(e2){setError(e2.message);}}}/>
              </label>
              {/* Thay ảnh mặt sau */}
              <label style={{display:"flex",alignItems:"center",gap:4,justifyContent:"center",cursor:"pointer",fontSize:10,color:"#6b675c",marginTop:2}}>
                <Upload size={10}/> {c.photoBack?"Đổi ảnh sau":"+ Thêm ảnh sau"}
                <input type="file" accept="image/*" style={{display:"none"}}
                  onChange={async e=>{if(!e.target.files[0])return;try{await adminPatchShirtColorFull(password,c.id,null,null,null,e.target.files[0],false);load();}catch(e2){setError(e2.message);}}}/>
              </label>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd}>
        <div className="xi-form-grid" style={{maxWidth:480,marginBottom:12}}>
          <div className="xi-field"><label>Tên màu áo *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Xanh Đậm" required/>
          </div>
          <div className="xi-field"><label>Màu đại diện</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="color" value={hex} onChange={e=>setHex(e.target.value)}/>
              <span className="xi-mono" style={{fontSize:12}}>{hex}</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
          <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",border:"2px dashed var(--orange)",padding:"10px 14px",borderRadius:6,fontSize:13,color:"var(--orange)",fontWeight:600}}>
            <Upload size={15}/>Mặt trước * {file&&<span style={{fontSize:11,color:"#555"}}>{file.name}</span>}
            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>onFileChange(e.target.files[0])}/>
          </label>
          <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",border:"2px dashed var(--line)",padding:"10px 14px",borderRadius:6,fontSize:13}}>
            <Upload size={15}/>Mặt sau (tuỳ chọn) {fileBack&&<span style={{fontSize:11,color:"#555"}}>{fileBack.name}</span>}
            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>setFileBack(e.target.files[0]||null)}/>
          </label>
        </div>
        {previewUrl&&<ColorEyedropper imageUrl={previewUrl} onColor={h=>setHex(h)} style={{marginBottom:12,maxWidth:480}}/>}
        <br/>
        <button type="submit" className="xi-btn-primary" disabled={busy}>
          {busy&&<Loader2 size={16} className="xi-spin"/>} Thêm màu áo
        </button>
      </form>
    </div>
  );
}

/* ── Màu mực ───────────────────────────────────────────── */
function InksTab({password}){
  const [list,setList]=useState(null);
  const [name,setName]=useState("");
  const [hex,setHex]=useState("#FF0000");
  const [error,setError]=useState(null);
  const [inkEdit,setInkEdit]=useState({});
  function load(){getInkColors().then(setList).catch(e=>setError(e.message));}
  useEffect(load,[]);
  async function handleAdd(e){
    e.preventDefault();setError(null);
    try{await adminAddInkColor(password,{name,hex});setName("");load();}catch(e){setError(e.message);}
  }
  if(!list) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/></div>;
  return(
    <div>
      <p className="xi-subtitle">Bảng màu mực áp dụng cho tất cả hình in. Khách chọn màu từ đây cho từng layer.</p>
      {error&&<div className="xi-error">{error}</div>}
      <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:24}}>
        {list.map(c=>(
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,background:"#fff",
            border:"2px solid var(--line)",borderRadius:30,padding:"5px 10px 5px 8px"}}>
            <input type="color" value={inkEdit[c.id]?.hex||c.hex}
              onChange={e=>setInkEdit(ie=>({...ie,[c.id]:{...ie[c.id],hex:e.target.value}}))}
              style={{width:22,height:22,border:"none",background:"none",cursor:"pointer",flexShrink:0}}/>
            <input value={inkEdit[c.id]?.name??c.name}
              onChange={e=>setInkEdit(ie=>({...ie,[c.id]:{...ie[c.id],name:e.target.value}}))}
              style={{fontSize:12,fontWeight:600,border:"none",outline:"none",
                background:"transparent",width:70}}/>
            {(inkEdit[c.id]?.name!==undefined&&inkEdit[c.id]?.name!==c.name)||
             (inkEdit[c.id]?.hex!==undefined&&inkEdit[c.id]?.hex!==c.hex) ? (
              <button onClick={async()=>{
                try{await adminPatchInkColor(password,c.id,{
                  name:inkEdit[c.id]?.name||c.name,
                  hex:inkEdit[c.id]?.hex||c.hex
                });setInkEdit(ie=>{const n={...ie};delete n[c.id];return n;});load();}
                catch(e){setError(e.message);}}}
                style={{fontSize:11,background:"var(--ink)",color:"#fff",border:"none",
                  borderRadius:3,padding:"2px 6px",cursor:"pointer"}}>✓</button>
            ):null}
            <button onClick={async()=>{try{await adminDeleteInkColor(password,c.id);load();}catch(e){setError(e.message);}}}
              style={{background:"none",border:"none",cursor:"pointer",color:"#a8453a",padding:0}}><Trash2 size={14}/></button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap",maxWidth:460}}>
        <div className="xi-field" style={{flex:1,minWidth:160}}><label>Tên màu</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Hồng Sen" required/>
        </div>
        <div className="xi-field"><label>Mã màu</label>
          <input type="color" value={hex} onChange={e=>setHex(e.target.value)}/>
        </div>
        <button type="submit" className="xi-btn-primary">Thêm màu mực</button>
      </form>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   DESIGNS TAB — có PSD auto-extract
═══════════════════════════════════════════════════════════ */
function DesignsTab({password}){
  const [designs,  setDesigns]  = useState(null);
  const [inkColors,setInkColors]= useState([]);
  const [settings, setSettings] = useState(null);
  const [newName,  setNewName]  = useState("");
  const [error,    setError]    = useState(null);
  const [expanded, setExpanded] = useState(null);

  // PSD extract state
  const [psdFile,    setPsdFile]    = useState(null);
  const [psdName,    setPsdName]    = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted,  setExtracted]  = useState(null); // {layers:[...], canvas:{w,h}}

  function load(){
    Promise.all([getDesigns(),getInkColors(),getSettings(),getShirtColors()])
      .then(([d,ic,s,sc])=>{
        setDesigns(d);setInkColors(ic);
        setSettings({...s, _firstShirtPhoto: sc[0]?.photo||null, _firstShirtPhotoBack: sc[0]?.photoBack||null});
      })
      .catch(e=>setError(e.message));
  }
  useEffect(load,[]);

  /* Tự động đặt tên từ tên file PSD */
  function onPsdFileChange(f){
    setPsdFile(f);
    setExtracted(null);
    if(f) setPsdName(f.name.replace(/\.(psd|psb|tiff?)/i,"").replace(/[_-]/g," ").trim());
  }

  /* Upload PSD → server tách layer */
  async function handleExtract(e){
    e.preventDefault();
    if(!psdFile) return setError("Cần chọn file PSD.");
    setExtracting(true); setError(null); setExtracted(null);
    try{
      const result = await adminExtractPsd(password, psdFile);
      // Gán màu mực mặc định (lần lượt từ bảng màu)
      const layersWithInk = result.layers.map((l,i)=>({
        ...l,
        layerName:    l.name,
        defaultInkId: inkColors[i % inkColors.length]?.id || (inkColors[0]?.id) || "black",
      }));
      setExtracted({...result, layers: layersWithInk});
    }catch(e){ setError("Lỗi tách PSD: " + e.message); }
    finally{ setExtracting(false); }
  }

  /* Tạo design trong DB từ kết quả extract */
  async function handleCreate(){
    if(!extracted||!psdName.trim()) return;
    setError(null);
    try{
      await adminCreateDesignFromPsd(
        password,
        psdName.trim(),
        extracted.layers.map(l=>({url:l.url, name:l.layerName, defaultInkId:l.defaultInkId})),
        null
      );
      // Reset
      setPsdFile(null); setPsdName(""); setExtracted(null);
      load();
    }catch(e){ setError(e.message); }
  }

  /* Thêm design trống */
  async function handleAddDesign(e){
    e.preventDefault();setError(null);
    try{await adminAddDesign(password,newName);setNewName("");load();}
    catch(e){setError(e.message);}
  }

  if(!designs) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/></div>;

  return(
    <div>
      {error&&<div className="xi-error">{error}</div>}

      {/* ── UPLOAD PSD TỰ ĐỘNG ─────────────────────────── */}
      <div style={{background:"#fff",border:"2px solid var(--orange)",borderRadius:8,padding:20,marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <Layers size={20} color="var(--orange)"/>
          <strong style={{fontSize:15}}>Upload PSD — Tách layer tự động</strong>
        </div>
        <p style={{fontSize:13,color:"#6b675c",marginBottom:14}}>
          Upload file <strong>.psd</strong> từ Photoshop. Hệ thống tự đọc từng layer, xuất thành PNG riêng,
          giữ nguyên tọa độ để các màu mực khớp nhau khi ghép lại.
        </p>

        <form onSubmit={handleExtract}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12}}>
            <div className="xi-field" style={{flex:1,minWidth:200}}>
              <label>Tên hình in *</label>
              <input value={psdName} onChange={e=>setPsdName(e.target.value)}
                placeholder="VD: Strawberry Bag" required/>
            </div>
            <div>
              <label style={{display:"inline-flex",alignItems:"center",gap:8,
                cursor:"pointer",border:"2px dashed var(--orange)",padding:"10px 14px",
                borderRadius:6,fontSize:13,color:"var(--orange)",fontWeight:600}}>
                <Upload size={16}/>
                {psdFile ? psdFile.name : "Chọn file .PSD / .PSB"}
                <input type="file" accept=".psd,.psb,.tif,.tiff" style={{display:"none"}}
                  onChange={e=>onPsdFileChange(e.target.files[0])}/>
              </label>
            </div>
            <button type="submit" className="xi-btn-primary"
              disabled={extracting||!psdFile}
              style={{background:"var(--orange)"}}>
              {extracting ? <><Loader2 size={16} className="xi-spin"/> Đang tách layer...</> : "⚡ Tách Layer"}
            </button>
          </div>
        </form>

        {/* Kết quả extract */}
        {extracted && (
          <div style={{marginTop:16,padding:16,background:"#f8f5ef",borderRadius:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <strong style={{color:"#2F9E44"}}>
                ✅ Tách thành công — {extracted.layers.length} layer
                <span style={{fontSize:12,fontWeight:400,color:"#6b675c",marginLeft:8}}>
                  ({extracted.canvas.w}×{extracted.canvas.h}px)
                </span>
              </strong>
            </div>

            {/* Hiển thị từng layer để chỉnh tên + màu mực mặc định */}
            <div style={{display:"grid",gap:10,marginBottom:16}}>
              {extracted.layers.map((l,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                  background:"#fff",border:"2px solid var(--line)",borderRadius:8,padding:"8px 12px",
                  flexWrap:"wrap"}}>
                  {/* Thumbnail */}
                  <div style={{width:56,height:56,background:"#e8e5de",borderRadius:6,
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                    <img src={l.url} alt={l.name}
                      style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",filter:"brightness(0)"}}/>
                  </div>
                  {/* Tên layer */}
                  <div className="xi-field" style={{flex:1,minWidth:150}}>
                    <label style={{fontSize:11}}>Tên layer</label>
                    <input value={l.layerName}
                      onChange={e=>setExtracted(ex=>({...ex,
                        layers:ex.layers.map((x,j)=>j===i?{...x,layerName:e.target.value}:x)
                      }))}
                      style={{fontSize:13}}/>
                  </div>
                  {/* Màu mực mặc định */}
                  <div className="xi-field" style={{minWidth:130}}>
                    <label style={{fontSize:11}}>Màu mực mặc định</label>
                    <select value={l.defaultInkId}
                      onChange={e=>setExtracted(ex=>({...ex,
                        layers:ex.layers.map((x,j)=>j===i?{...x,defaultInkId:e.target.value}:x)
                      }))}
                      style={{fontSize:13}}>
                      {inkColors.map(c=>(
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Ink count */}
                  <div style={{fontSize:11,color:"#8a8576",textAlign:"center"}}>
                    {(l.inkPx/1000).toFixed(0)}K px
                  </div>
                </div>
              ))}
            </div>

            <button className="xi-btn-primary" onClick={handleCreate}
              style={{fontSize:15,padding:"12px 28px"}}>
              ✅ Tạo hình in "{psdName}"
            </button>
          </div>
        )}
      </div>

      {/* ── DANH SÁCH DESIGNS ──────────────────────────── */}
      {designs.map(d=>(
        <DesignCard key={d.id} design={d} inkColors={inkColors} settings={settings}
          password={password} onChange={load} setError={setError}
          expanded={expanded===d.id} onToggle={()=>setExpanded(expanded===d.id?null:d.id)}/>
      ))}

      {/* Thêm design trống */}
      <form onSubmit={handleAddDesign} style={{display:"flex",gap:10,maxWidth:460,marginTop:8}}>
        <input value={newName} onChange={e=>setNewName(e.target.value)}
          placeholder="Hoặc tạo hình in trống (thêm layer tay)..." required
          style={{flex:1,border:"2px solid var(--line)",borderRadius:3,
            padding:"10px 12px",fontFamily:"Work Sans",fontSize:14}}/>
        <button className="xi-btn-secondary" type="submit">+ Tạo trống</button>
      </form>
    </div>
  );
}

/* ── Design Card (mở rộng để chỉnh layer + positioner) ─ */
function DesignCard({design,inkColors,settings,password,onChange,setError,expanded,onToggle}){
  const [printArea,     setPrintArea]     = useState(design.printArea);
  const [printAreaBack, setPrintAreaBack] = useState(design.printAreaBack||null);
  const [savingPos,     setSavingPos]     = useState(false);
  const [newLayer,   setNewLayer]   = useState({name:"",defaultInkId:"",files:[],side:"front"});
  const [busy,       setBusy]       = useState(false);

  const rulerPhotoUrl = settings?.rulerMockupPhoto||settings?.rulerPhoto||"/seed-uploads/mockup-ruler.png";
  const calibration   = settings?.printCalibration;
  const handlePrintAreaChange = useCallback(area=>setPrintArea(area),[]);

  async function savePosition(){
    setSavingPos(true);
    try{
      await adminPatchDesign(password,design.id,{printArea});
      await adminSetPrintAreaBack(password,design.id,printAreaBack);
      onChange();
    }catch(e){setError(e.message);}finally{setSavingPos(false);}
  }
  async function handleAddLayer(e){
    e.preventDefault();
    const files = newLayer.files||[];
    if(!files.length) return setError("Cần chọn ít nhất 1 file PNG.");
    setBusy(true);
    try{
      for(let i=0;i<files.length;i++){
        const file = files[i];
        // Ten layer: dung ten file neu co nhieu file, dung ten nhap neu 1 file
        const layerName = files.length===1 && newLayer.name
          ? newLayer.name
          : file.name.replace(/\.(png|tif|tiff)$/i,"").replace(/[_-]/g," ").trim() || `Layer ${i+1}`;
        const inkId = newLayer.defaultInkId || inkColors[i%inkColors.length]?.id || inkColors[0]?.id;
        await adminAddLayer(password,design.id,layerName,inkId,file,newLayer.side||"front");
      }
      setNewLayer({name:"",defaultInkId:"",files:[],side:"front"});onChange();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }

  return(
    <div className="xi-order-card" style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={onToggle}>
        {expanded?<ChevronDown size={18}/>:<ChevronRight size={18}/>}
        <strong style={{fontSize:15,flex:1}}>{design.name}</strong>
        <div style={{display:"flex",gap:6}}>
          {design.layers.slice(0,4).map(l=>(
            <img key={l.id} src={l.png} alt={l.name}
              style={{width:28,height:28,objectFit:"contain",
                filter:"brightness(0)",background:"#f0f0f0",borderRadius:4,padding:2}}/>
          ))}
          {design.layers.length>4&&<span style={{fontSize:11,color:"#8a8576"}}>+{design.layers.length-4}</span>}
        </div>
        <button onClick={e=>{e.stopPropagation();if(!confirm("Xoá hình in này và toàn bộ layers?"))return;
          adminDeleteDesign(password,design.id).then(onChange).catch(e=>setError(e.message));}}
          className="xi-remove-btn"><Trash2 size={16}/></button>
      </div>

      {expanded&&(
        <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid var(--line)"}}>
          {/* Positioner */}
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span className="xi-label" style={{marginBottom:0}}>📍 Vị trí in trên áo</span>
              <button className="xi-btn-primary" style={{padding:"8px 16px"}}
                onClick={savePosition} disabled={savingPos}>
                {savingPos&&<Loader2 size={14} className="xi-spin"/>} Lưu vị trí
              </button>
            </div>
            <DesignPositioner
              shirtPhotoUrl={settings?._firstShirtPhoto}
              shirtPhotoBackUrl={settings?._firstShirtPhotoBack}
              designLayers={design.layers}
              printArea={printArea}
              printAreaBack={printAreaBack}
              calibration={calibration}
              onChangeFront={handlePrintAreaChange}
              onChangeBack={setPrintAreaBack}/>
          </div>

          {/* Layers */}
          <div>
            <span className="xi-label">Layers màu mực ({design.layers.length})</span>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:14}}>
              {design.layers.map((l,idx)=>(
                <div key={l.id} style={{background:"#f8f5ef",border:"2px solid var(--line)",borderRadius:8,padding:10,textAlign:"center"}}>
                  <div style={{background:"#e8e5de",borderRadius:6,padding:6,marginBottom:4,position:"relative"}}>
                    <img src={l.png} alt={l.name}
                      style={{width:56,height:56,objectFit:"contain",filter:"brightness(0)"}}/>
                    <label title="Thay PNG" style={{position:"absolute",bottom:2,right:2,
                      background:"var(--orange)",borderRadius:3,cursor:"pointer",
                      padding:"1px 4px",fontSize:10,color:"#fff"}}>
                      ✎<input type="file" accept=".png,.tif,.tiff" style={{display:"none"}}
                        onChange={async e=>{if(!e.target.files[0])return;
                          try{await adminPatchLayerFull(password,design.id,l.id,null,null,e.target.files[0]);onChange();}
                          catch(e2){setError(e2.message);}}}/>
                    </label>
                  </div>
                  <input defaultValue={l.name} key={l.id+"n"}
                    onBlur={async e=>{if(e.target.value&&e.target.value!==l.name)
                      try{await adminPatchLayer(password,design.id,l.id,{name:e.target.value});onChange();}
                      catch(e2){setError(e2.message);}}}
                    style={{fontSize:11,fontWeight:700,border:"1px solid var(--line)",
                      borderRadius:3,padding:"2px 4px",width:"100%",marginBottom:4,textAlign:"center"}}/>
                  <select value={l.defaultInkId||""} style={{fontSize:11,width:"100%",marginBottom:4}}
                    onChange={async e=>{try{await adminPatchLayer(password,design.id,l.id,{defaultInkId:e.target.value});onChange();}catch(e2){setError(e2.message);}}}>
                    {inkColors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={l.side||"front"}
                    style={{fontSize:10,width:"100%",marginBottom:6,fontWeight:700,
                      border:"1px solid var(--line)",borderRadius:3,padding:"2px 4px",
                      background:l.side==="back"?"#dbeafe":l.side==="both"?"#fef9c3":"#dcfce7",
                      color:l.side==="back"?"#1d4ed8":l.side==="both"?"#92400e":"#166534"}}
                    onChange={async e=>{
                      try{await adminPatchLayer(password,design.id,l.id,{side:e.target.value});onChange();}
                      catch(e2){setError(e2.message);}
                    }}>
                    <option value="front">⬜ Mặt trước</option>
                    <option value="back">⬛ Mặt sau</option>
                    <option value="both">◧ Cả hai mặt</option>
                  </select>
                  {/* Nut doi thu tu layer */}
                  <div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:4}}>
                    <button title="Lên trên" disabled={idx===0}
                      onClick={async()=>{
                        const ids=design.layers.map(x=>x.id);
                        [ids[idx-1],ids[idx]]=[ids[idx],ids[idx-1]];
                        try{await adminReorderLayers(password,design.id,ids);onChange();}catch(e){setError(e.message);}
                      }}
                      style={{flex:1,fontSize:12,border:"1px solid var(--line)",background:"#fff",borderRadius:3,cursor:"pointer",padding:"2px 0",opacity:idx===0?0.3:1}}>▲</button>
                    <button title="Xuống dưới" disabled={idx===design.layers.length-1}
                      onClick={async()=>{
                        const ids=design.layers.map(x=>x.id);
                        [ids[idx],ids[idx+1]]=[ids[idx+1],ids[idx]];
                        try{await adminReorderLayers(password,design.id,ids);onChange();}catch(e){setError(e.message);}
                      }}
                      style={{flex:1,fontSize:12,border:"1px solid var(--line)",background:"#fff",borderRadius:3,cursor:"pointer",padding:"2px 0",opacity:idx===design.layers.length-1?0.3:1}}>▼</button>
                  </div>
                  <button className="xi-remove-btn" style={{fontSize:11,margin:"0 auto",display:"flex",alignItems:"center",gap:3}}
                    onClick={async()=>{if(!confirm("Xoá layer?"))return;
                      try{await adminDeleteLayer(password,design.id,l.id);onChange();}catch(e){setError(e.message);}}}>
                    <Trash2 size={12}/> Xoá
                  </button>
                </div>
              ))}
            </div>

            {/* Thêm layer thủ công */}
            <details style={{marginTop:8}}>
              <summary style={{cursor:"pointer",fontSize:13,color:"#8a8576",marginBottom:8}}>
                + Thêm layer PNG thủ công
              </summary>
              <form onSubmit={handleAddLayer}
                style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",
                  background:"#f8f5ef",padding:12,borderRadius:8,marginTop:8}}>
                <div className="xi-field" style={{flex:1,minWidth:140}}>
                  <label>Tên layer {newLayer.files?.length<=1?"*":"(tự động từ tên file)"}</label>
                  <input value={newLayer.name}
                    onChange={e=>setNewLayer(l=>({...l,name:e.target.value}))}
                    placeholder={newLayer.files?.length>1?"Tự động theo tên file":"VD: Thân chính"}
                    required={!newLayer.files||newLayer.files.length<=1}/>
                </div>
                <div className="xi-field">
                  <label>Màu mặc định</label>
                  <select value={newLayer.defaultInkId}
                    onChange={e=>setNewLayer(l=>({...l,defaultInkId:e.target.value}))}>
                    <option value="">— Chọn —</option>
                    {inkColors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <label style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",
                  border:"2px dashed var(--orange)",padding:"8px 12px",borderRadius:6,fontSize:13,
                  color:"var(--orange)",fontWeight:600}}>
                  <Upload size={14}/>
                  {newLayer.files?.length ? `${newLayer.files.length} file đã chọn` : "Chọn PNG (nhiều file)"}
                  <input type="file" accept=".png,.tif,.tiff,image/png,image/tiff"
                    multiple style={{display:"none"}}
                    onChange={e=>setNewLayer(l=>({...l,files:Array.from(e.target.files)}))}/>
                </label>
                <button type="submit" className="xi-btn-secondary" disabled={busy}>
                  {busy&&<Loader2 size={14} className="xi-spin"/>} + Thêm tất cả
                </button>
              </form>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Cài đặt ───────────────────────────────────────────── */
function SettingsTab({password}){
  const [settings,setSettings]=useState(null);
  const [busy,setBusy]=useState(null);
  const [error,setError]=useState(null);
  const [cal,setCal]=useState(null);
  function load(){getSettings().then(s=>{setSettings(s);setCal(s.printCalibration);}).catch(e=>setError(e.message));}
  useEffect(load,[]);
  async function handleRulerUpload(field,file){
    setBusy(field);setError(null);
    try{const s=await adminUploadRuler(password,field,file);setSettings(s);}
    catch(e){setError(e.message);}finally{setBusy(null);}
  }
  async function saveCalibration(){
    setBusy("cal");setError(null);
    try{const s=await adminUpdateSettings(password,{printCalibration:cal});setSettings(s);}
    catch(e){setError(e.message);}finally{setBusy(null);}
  }
  if(!settings) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/></div>;
  return(
    <div>
      {error&&<div className="xi-error">{error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:28}}>
        {[["rulerMockupPhoto","Ảnh thước đo trên áo (dùng để định vị hình in)"],
          ["rulerPhoto","Ảnh thước đo độc lập (tham khảo)"]].map(([field,label])=>(
          <div key={field}>
            <span className="xi-label">{label}</span>
            {settings[field]&&<img src={settings[field]} alt={field}
              style={{width:"100%",maxHeight:160,objectFit:"contain",borderRadius:6,
                border:"2px solid var(--line)",marginBottom:8}}/>}
            <label style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",
              border:"2px dashed var(--line)",padding:"8px 12px",borderRadius:6,fontSize:13}}>
              <Upload size={14}/> Tải lên / Cập nhật
              <input type="file" accept="image/*" style={{display:"none"}}
                onChange={e=>e.target.files[0]&&handleRulerUpload(field,e.target.files[0])}/>
            </label>
            {busy===field&&<span style={{marginLeft:8,fontSize:12,color:"#8a8576"}}>Đang tải...</span>}
          </div>
        ))}
      </div>
      {cal&&(
        <div style={{background:"#f8f5ef",borderRadius:8,padding:16,maxWidth:480}}>
          <span className="xi-label">Hiệu chỉnh thước đo</span>
          {[["originX","Điểm gốc X (0-1)"],["originY","Điểm gốc Y (0-1)"],["fracPerCm","1 cm = ? fraction"]].map(([key,label])=>(
            <div key={key} className="xi-field" style={{marginBottom:10}}>
              <label>{label}</label>
              <input type="number" step="0.001" value={cal[key]||""}
                onChange={e=>setCal(c=>({...c,[key]:parseFloat(e.target.value)}))}
                style={{fontFamily:"JetBrains Mono"}}/>
            </div>
          ))}
          <button className="xi-btn-primary" onClick={saveCalibration} disabled={busy==="cal"}>
            {busy==="cal"&&<Loader2 size={14} className="xi-spin"/>} Lưu calibration
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Tài khoản nhân viên ───────────────────────────────── */
function AccountsTab({password}){
  const [list,    setList]    = useState(null);
  const [name,    setName]    = useState("");
  const [pw,      setPw]      = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [role2,   setRole2]   = useState("staff");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);

  function load(){
    adminGetAccounts(password).then(setList).catch(e=>setError(e.message));
  }
  useEffect(load,[password]);

  async function handleAdd(e){
    e.preventDefault(); setError(null); setBusy(true);
    try{
      await adminAddAccount(password,name,pw,role2);
      setName(""); setPw(""); load();
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }

  if(!list) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/></div>;

  return(
    <div>
      <p className="xi-subtitle">
        Mỗi tài khoản có mật khẩu riêng — có thể thêm/xóa mà không ảnh hưởng tài khoản khác.
        Tất cả tài khoản có cùng quyền quản trị.
      </p>
      {error&&<div className="xi-error">{error}</div>}

      {/* Danh sách */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
        {list.map(a=>(
          <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,
            background:"#fff",border:"2px solid var(--line)",borderRadius:8,padding:"12px 16px"}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:"var(--ink)",
              color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
              fontWeight:700,fontSize:16,flexShrink:0}}>
              {a.name[0].toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <span style={{fontWeight:600}}>{a.name}</span>
              <span style={{marginLeft:8,fontSize:11,
                background:a.role==="owner"?"var(--orange)":"var(--line)",
                color:a.role==="owner"?"#fff":"#555",
                padding:"1px 6px",borderRadius:10,fontWeight:600}}>
                {a.role==="owner"?"OWNER":"Nhân viên"}
              </span>
            </div>
            <button onClick={async()=>{
              if(!confirm(`Xóa tài khoản "${a.name}"?`))return;
              try{await adminDeleteAccount(password,a.id);load();}catch(e){setError(e.message);}
            }} className="xi-remove-btn"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>

      {/* Thêm tài khoản */}
      <div style={{background:"#f8f5ef",borderRadius:8,padding:20,maxWidth:480}}>
        <strong style={{fontSize:14,display:"block",marginBottom:14}}>+ Thêm tài khoản mới</strong>
        <form onSubmit={handleAdd}>
          <div className="xi-field" style={{marginBottom:12}}>
            <label>Tên nhân viên *</label>
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder="VD: Lan, Minh..." required/>
          </div>
          <div className="xi-field" style={{marginBottom:12}}>
            <label>Mật khẩu *</label>
            <div style={{display:"flex",gap:8}}>
              <input type={showPw?"text":"password"} value={pw}
                onChange={e=>setPw(e.target.value)}
                placeholder="Tối thiểu 8 ký tự" required minLength={8} style={{flex:1}}/>
              <button type="button" onClick={()=>setShowPw(s=>!s)}
                style={{background:"var(--line)",border:"none",borderRadius:3,
                  padding:"0 12px",cursor:"pointer",fontSize:12}}>
                {showPw?"Ẩn":"Hiện"}
              </button>
            </div>
          </div>
          <div className="xi-field" style={{marginBottom:16}}>
            <label>Phân quyền</label>
            <select value={role2} onChange={e=>setRole2(e.target.value)}>
              <option value="staff">Nhân viên — thêm/sửa màu áo, hình in, xem đơn hàng</option>
              <option value="owner">Owner — toàn quyền</option>
            </select>
          </div>
          <button type="submit" className="xi-btn-primary" disabled={busy}>
            {busy&&<Loader2 size={16} className="xi-spin"/>} Tạo tài khoản
          </button>
        </form>
      </div>
    </div>
  );
}
