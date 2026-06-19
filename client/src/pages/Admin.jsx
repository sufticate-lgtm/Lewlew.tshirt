import { useEffect, useState } from "react";
import { Trash2, Loader2, LogOut, Upload } from "lucide-react";
import {
  adminLogin, adminGetOrders, adminUpdateOrderStatus,
  getShirtColors, adminAddShirtColor, adminDeleteShirtColor,
  getInkColors,  adminAddInkColor,   adminDeleteInkColor,
  getDesigns,    adminAddDesign,     adminDeleteDesign,
} from "../api";
import { formatVND } from "../utils";

const PW_KEY = "xi_admin_pw";
const ORDER_STATUSES = ["Đang xử lý","Đang in","Đã giao","Hoàn tất","Đã hủy"];

export default function Admin() {
  const [password,    setPassword]    = useState(() => localStorage.getItem(PW_KEY) || "");
  const [loggedIn,    setLoggedIn]    = useState(false);
  const [loginInput,  setLoginInput]  = useState("");
  const [loginError,  setLoginError]  = useState(null);
  const [checking,    setChecking]    = useState(true);

  useEffect(() => {
    if (!password) { setChecking(false); return; }
    adminLogin(password).then(() => setLoggedIn(true))
      .catch(() => { localStorage.removeItem(PW_KEY); setPassword(""); })
      .finally(() => setChecking(false));
  }, [password]);

  async function handleLogin(e) {
    e.preventDefault(); setLoginError(null);
    try {
      await adminLogin(loginInput);
      localStorage.setItem(PW_KEY, loginInput);
      setPassword(loginInput); setLoggedIn(true);
    } catch(e) { setLoginError(e.message); }
  }

  if (checking) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang kiểm tra...</div>;

  if (!loggedIn) return (
    <div className="xi-admin-login">
      <h1 className="xi-title">Đăng Nhập Quản Trị</h1>
      {loginError && <div className="xi-error">{loginError}</div>}
      <form onSubmit={handleLogin} className="xi-field">
        <label>Mật khẩu quản trị</label>
        <input type="password" value={loginInput} onChange={e => setLoginInput(e.target.value)} autoFocus/>
        <button type="submit" className="xi-btn-primary" style={{marginTop:14,justifyContent:"center"}}>Đăng nhập</button>
      </form>
    </div>
  );

  return <Dashboard password={password} onLogout={() => { localStorage.removeItem(PW_KEY); setPassword(""); setLoggedIn(false); }}/>;
}

function Dashboard({ password, onLogout }) {
  const [tab, setTab] = useState("orders");
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <h1 className="xi-title" style={{marginBottom:0}}>Trang Quản Trị</h1>
        <button className="xi-btn-secondary" onClick={onLogout}><LogOut size={16}/> Đăng xuất</button>
      </div>
      <div className="xi-tabs">
        <button className={tab==="orders"?"active":""} onClick={()=>setTab("orders")}>Đơn hàng</button>
        <button className={tab==="shirts"?"active":""} onClick={()=>setTab("shirts")}>Màu áo + ảnh</button>
        <button className={tab==="inks"?"active":""}   onClick={()=>setTab("inks")}>Màu mực</button>
        <button className={tab==="designs"?"active":""} onClick={()=>setTab("designs")}>Hình in (PNG đen)</button>
      </div>
      {tab==="orders"  && <OrdersTab  password={password}/>}
      {tab==="shirts"  && <ShirtsTab  password={password}/>}
      {tab==="inks"    && <InksTab    password={password}/>}
      {tab==="designs" && <DesignsTab password={password}/>}
    </div>
  );
}

/* ── Đơn hàng ────────────────────────────────────── */
function OrdersTab({ password }) {
  const [orders, setOrders] = useState(null);
  const [error, setError]   = useState(null);
  function load() { adminGetOrders(password).then(setOrders).catch(e => setError(e.message)); }
  useEffect(load, [password]);
  async function changeStatus(code, status) {
    try { await adminUpdateOrderStatus(password, code, status); load(); }
    catch(e) { setError(e.message); }
  }
  if (error)   return <div className="xi-error">{error}</div>;
  if (!orders) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang tải đơn hàng...</div>;
  if (!orders.length) return <p>Chưa có đơn hàng nào.</p>;
  return (
    <div className="xi-orders-list">
      {orders.map(o => (
        <div key={o.code} className="xi-order-card">
          <div className="xi-order-head">
            <div>
              <div className="xi-mono" style={{fontWeight:700}}>{o.code}</div>
              <div className="xi-cart-item-meta">{o.customer.name} · {o.customer.phone} · {new Date(o.createdAt).toLocaleString("vi-VN")}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <strong>{formatVND(o.total)}</strong>
              <select value={o.status} onChange={e => changeStatus(o.code, e.target.value)}>
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginTop:10,fontSize:13,color:"#6b675c"}}>
            {o.items.map((it,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{width:12,height:12,borderRadius:"50%",background:it.inkHex,display:"inline-block",border:"1px solid #ccc"}}/>
                {it.designName} · Áo {it.shirtName} · Mực {it.inkName} · {it.size} x{it.qty}
              </div>
            ))}
            <div>Địa chỉ: {o.customer.address}</div>
            <div>Thanh toán: {o.payment==="cod"?"COD":o.payment==="bank"?"Chuyển khoản":"Momo/ZaloPay"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Màu áo + ảnh mockup ─────────────────────────── */
function ShirtsTab({ password }) {
  const [list,  setList]  = useState(null);
  const [name,  setName]  = useState("");
  const [hex,   setHex]   = useState("#333333");
  const [file,  setFile]  = useState(null);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState(null);

  function load() { getShirtColors().then(setList).catch(e => setError(e.message)); }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault(); if (!file) return setError("Cần chọn ảnh mockup.");
    setBusy(true); setError(null);
    try { await adminAddShirtColor(password, name, hex, file); setName(""); setFile(null); load(); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!list) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang tải...</div>;
  return (
    <div>
      <p className="xi-subtitle">
        Mỗi màu áo cần một ảnh mockup thật (ảnh chụp áo trơn, chưa có hình in). 
        Hệ thống sẽ ghép hình in lên ảnh này bằng thuật toán khi khách xem trước.
      </p>
      {error && <div className="xi-error">{error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:12,marginBottom:24}}>
        {list.map(c => (
          <div key={c.id} style={{textAlign:"center"}}>
            <div style={{position:"relative",display:"inline-block"}}>
              <img src={c.photo} alt={c.name} style={{width:"100%",maxWidth:110,height:120,objectFit:"cover",borderRadius:8,border:"2px solid var(--line)"}}/>
              <button onClick={async()=>{try{await adminDeleteShirtColor(password,c.id);load();}catch(e){setError(e.message);}}}
                style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.6)",border:"none",color:"#fff",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:14}}>×</button>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:6}}>
              <div style={{width:14,height:14,borderRadius:"50%",background:c.hex,border:"1px solid #ccc"}}/>
              <span style={{fontSize:12,fontWeight:600}}>{c.name}</span>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd}>
        <div className="xi-form-grid" style={{maxWidth:480,marginBottom:10}}>
          <div className="xi-field"><label>Tên màu áo *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Đỏ Đô" required/>
          </div>
          <div className="xi-field"><label>Màu đại diện (để hiển thị nút tròn)</label>
            <input type="color" value={hex} onChange={e=>setHex(e.target.value)}/>
          </div>
        </div>
        <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",border:"2px dashed var(--line)",padding:"10px 16px",borderRadius:6,marginBottom:12}}>
          <Upload size={16}/> {file ? file.name : "Chọn ảnh mockup áo trơn *"}
          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>setFile(e.target.files[0])}/>
        </label>
        <br/>
        <button type="submit" className="xi-btn-primary" disabled={busy}>
          {busy?<Loader2 size={16} className="xi-spin"/>:null} Thêm màu áo
        </button>
      </form>
    </div>
  );
}

/* ── Màu mực (bảng màu toàn cục) ────────────────── */
function InksTab({ password }) {
  const [list,  setList]  = useState(null);
  const [name,  setName]  = useState("");
  const [hex,   setHex]   = useState("#FF0000");
  const [error, setError] = useState(null);

  function load() { getInkColors().then(setList).catch(e=>setError(e.message)); }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault(); setError(null);
    try { await adminAddInkColor(password,{name,hex}); setName(""); load(); }
    catch(e) { setError(e.message); }
  }
  if (!list) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang tải...</div>;
  return (
    <div>
      <p className="xi-subtitle">
        Bảng màu mực này áp dụng cho <strong>tất cả hình in</strong>. Khách sẽ thấy các màu này khi chọn hình.
        Thuật toán tô màu sẽ đổi file PNG đen thành màu tương ứng ngay trong trình duyệt.
      </p>
      {error && <div className="xi-error">{error}</div>}
      <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:24}}>
        {list.map(c => (
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,background:"#fff",
            border:"2px solid var(--line)",borderRadius:30,padding:"6px 12px 6px 8px"}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:c.hex,border:"1px solid #ccc",flexShrink:0}}/>
            <span style={{fontSize:13,fontWeight:600}}>{c.name}</span>
            <button onClick={async()=>{try{await adminDeleteInkColor(password,c.id);load();}catch(e){setError(e.message);}}}
              style={{background:"none",border:"none",cursor:"pointer",color:"#a8453a",padding:0,marginLeft:2}}>
              <Trash2 size={14}/>
            </button>
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

/* ── Hình in (PNG đen) ───────────────────────────── */
function DesignsTab({ password }) {
  const [list,  setList]  = useState(null);
  const [name,  setName]  = useState("");
  const [file,  setFile]  = useState(null);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState(null);

  function load() { getDesigns().then(setList).catch(e=>setError(e.message)); }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault(); if (!file) return setError("Cần chọn file PNG.");
    setBusy(true); setError(null);
    try { await adminAddDesign(password, name, file); setName(""); setFile(null); load(); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!list) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang tải...</div>;
  return (
    <div>
      <p className="xi-subtitle">
        Tải lên file PNG hình in <strong>màu đen trên nền trong suốt</strong> (transparent background).
        Hệ thống sẽ tự tô bất kỳ màu nào khách chọn từ bảng màu mực, không cần tải nhiều phiên bản màu.
      </p>
      {error && <div className="xi-error">{error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:14,marginBottom:24}}>
        {list.map(d => (
          <div key={d.id} style={{textAlign:"center",background:"#fff",border:"2px solid var(--line)",borderRadius:8,padding:12}}>
            <div style={{background:"#f0f0f0",borderRadius:6,padding:8,marginBottom:8}}>
              <img src={d.png} alt={d.name}
                style={{width:80,height:80,objectFit:"contain",filter:"brightness(0)"}}/>
            </div>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>{d.name}</div>
            <button onClick={async()=>{if(!confirm("Xoá hình in này?"))return;try{await adminDeleteDesign(password,d.id);load();}catch(e){setError(e.message);}}}
              className="xi-remove-btn" style={{fontSize:12,display:"flex",alignItems:"center",gap:4,margin:"0 auto"}}>
              <Trash2 size={14}/> Xoá
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd}>
        <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap",maxWidth:480,marginBottom:10}}>
          <div className="xi-field" style={{flex:1}}><label>Tên hình in *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Mèo Yoga" required/>
          </div>
        </div>
        <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",border:"2px dashed var(--line)",padding:"10px 16px",borderRadius:6,marginBottom:12}}>
          <Upload size={16}/> {file ? file.name : "Chọn file PNG màu đen *"}
          <input type="file" accept="image/png" style={{display:"none"}} onChange={e=>setFile(e.target.files[0])}/>
        </label>
        {file && (
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:"#6b675c",marginBottom:4}}>Xem trước (nền xám = trong suốt):</div>
            <div style={{background:"#e0e0e0",display:"inline-block",padding:8,borderRadius:6}}>
              <img src={URL.createObjectURL(file)} alt="preview"
                style={{width:80,height:80,objectFit:"contain",filter:"brightness(0)"}}/>
            </div>
          </div>
        )}
        <br/>
        <button type="submit" className="xi-btn-primary" disabled={busy}>
          {busy?<Loader2 size={16} className="xi-spin"/>:null} Tải lên hình in
        </button>
      </form>
    </div>
  );
}
