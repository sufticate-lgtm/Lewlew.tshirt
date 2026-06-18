import { useEffect, useState } from "react";
import { Trash2, Loader2, LogOut, Upload, X } from "lucide-react";
import {
  adminLogin, adminGetOrders, adminUpdateOrderStatus,
  getShirtColors, adminAddShirtColor, adminDeleteShirtColor,
  getDesigns, adminAddDesign, adminDeleteDesign,
  adminAddVariant, adminDeleteVariant, adminUploadVariantPhoto, adminDeleteVariantPhoto,
} from "../api";
import { formatVND } from "../utils";

const PW_KEY = "xi_admin_pw";
const ORDER_STATUSES = ["Đang xử lý", "Đang in", "Đã giao", "Hoàn tất", "Đã hủy"];

export default function Admin() {
  const [password, setPassword] = useState(() => localStorage.getItem(PW_KEY) || "");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!password) { setChecking(false); return; }
    adminLogin(password)
      .then(() => setLoggedIn(true))
      .catch(() => { localStorage.removeItem(PW_KEY); setPassword(""); })
      .finally(() => setChecking(false));
  }, [password]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError(null);
    try {
      await adminLogin(loginInput);
      localStorage.setItem(PW_KEY, loginInput);
      setPassword(loginInput);
      setLoggedIn(true);
    } catch (e) {
      setLoginError(e.message);
    }
  }
  function handleLogout() {
    localStorage.removeItem(PW_KEY);
    setPassword("");
    setLoggedIn(false);
  }

  if (checking) return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang kiểm tra đăng nhập...</div>;

  if (!loggedIn) {
    return (
      <div className="xi-admin-login">
        <h1 className="xi-title">Đăng Nhập Quản Trị</h1>
        {loginError && <div className="xi-error">{loginError}</div>}
        <form onSubmit={handleLogin} className="xi-field">
          <label>Mật khẩu quản trị</label>
          <input type="password" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} autoFocus />
          <button type="submit" className="xi-btn-primary" style={{ marginTop: 14, justifyContent: "center" }}>Đăng nhập</button>
        </form>
      </div>
    );
  }

  return <Dashboard password={password} onLogout={handleLogout} />;
}

function Dashboard({ password, onLogout }) {
  const [tab, setTab] = useState("orders");
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <h1 className="xi-title" style={{ marginBottom: 0 }}>Trang Quản Trị</h1>
        <button className="xi-btn-secondary" onClick={onLogout}><LogOut size={16} /> Đăng xuất</button>
      </div>
      <div className="xi-tabs">
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Đơn hàng</button>
        <button className={tab === "shirtColors" ? "active" : ""} onClick={() => setTab("shirtColors")}>Màu áo</button>
        <button className={tab === "designs" ? "active" : ""} onClick={() => setTab("designs")}>Mẫu in &amp; ảnh</button>
      </div>
      {tab === "orders" && <OrdersTab password={password} />}
      {tab === "shirtColors" && <ShirtColorsTab password={password} />}
      {tab === "designs" && <DesignsTab password={password} />}
    </div>
  );
}

function OrdersTab({ password }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    adminGetOrders(password).then(setOrders).catch((e) => setError(e.message));
  }
  useEffect(load, [password]);

  async function changeStatus(code, status) {
    try {
      await adminUpdateOrderStatus(password, code, status);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="xi-error">{error}</div>;
  if (!orders) return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang tải đơn hàng...</div>;
  if (orders.length === 0) return <p>Chưa có đơn hàng nào.</p>;

  return (
    <div className="xi-orders-list">
      {orders.map((o) => (
        <div key={o.code} className="xi-order-card">
          <div className="xi-order-head">
            <div>
              <div className="xi-mono" style={{ fontWeight: 700 }}>{o.code}</div>
              <div className="xi-cart-item-meta">{o.customer.name} · {o.customer.phone} · {new Date(o.createdAt).toLocaleString("vi-VN")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <strong>{formatVND(o.total)}</strong>
              <select value={o.status} onChange={(e) => changeStatus(o.code, e.target.value)}>
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: "#6b675c" }}>
            {o.items.map((it, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {it.photo && <img src={it.photo} alt={it.designName} style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4 }} />}
                {it.designName} · {it.variantName} · {it.shirtName} · {it.size} x{it.qty}
              </div>
            ))}
            <div>Địa chỉ: {o.customer.address}</div>
            <div>Thanh toán: {o.payment === "cod" ? "COD" : o.payment === "bank" ? "Chuyển khoản" : "Momo/ZaloPay"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShirtColorsTab({ password }) {
  const [list, setList] = useState(null);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#888888");
  const [error, setError] = useState(null);

  function load() {
    getShirtColors().then(setList).catch((e) => setError(e.message));
  }
  useEffect(load, [password]);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    try {
      await adminAddShirtColor(password, { name, hex });
      setName("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function handleDelete(id) {
    try {
      await adminDeleteShirtColor(password, id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="xi-error">{error}</div>;
  if (!list) return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang tải...</div>;

  return (
    <div>
      <p className="xi-subtitle">Danh sách màu áo bạn có sẵn để bán. Khi thêm ảnh cho một mẫu in, bạn sẽ chọn ảnh cho từng màu trong danh sách này.</p>
      <div className="xi-admin-list">
        {list.map((c) => (
          <div key={c.id} className="xi-admin-row">
            <div className="xi-swatch-sm" style={{ background: c.hex }} />
            <div className="grow">{c.name} <span className="xi-cart-item-meta">{c.hex}</span></div>
            <button className="xi-remove-btn" onClick={() => handleDelete(c.id)}><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="xi-form-grid" style={{ maxWidth: 420 }}>
        <div className="xi-field"><label>Tên màu</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="xi-field"><label>Mã màu (chỉ để hiển thị nút chọn)</label><input type="color" value={hex} onChange={(e) => setHex(e.target.value)} /></div>
        <button type="submit" className="xi-btn-primary" style={{ gridColumn: "1/-1", justifyContent: "center" }}>Thêm màu áo</button>
      </form>
    </div>
  );
}

function DesignsTab({ password }) {
  const [designs, setDesigns] = useState(null);
  const [shirtColors, setShirtColors] = useState([]);
  const [error, setError] = useState(null);
  const [newDesignName, setNewDesignName] = useState("");

  function load() {
    Promise.all([getDesigns(), getShirtColors()])
      .then(([d, sc]) => { setDesigns(d); setShirtColors(sc); })
      .catch((e) => setError(e.message));
  }
  useEffect(load, [password]);

  async function handleAddDesign(e) {
    e.preventDefault();
    setError(null);
    try {
      await adminAddDesign(password, newDesignName);
      setNewDesignName("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function handleDeleteDesign(id) {
    if (!confirm("Xoá mẫu in này và toàn bộ ảnh đã gắn với nó?")) return;
    try {
      await adminDeleteDesign(password, id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="xi-error">{error}</div>;
  if (!designs) return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang tải...</div>;

  return (
    <div>
      <p className="xi-subtitle">
        Mỗi mẫu in có thể có nhiều "biến thể màu mực" (ví dụ: bản Hồng - Kem, bản Cam - Trắng). Với mỗi biến thể, tải lên một ảnh
        chụp riêng cho từng màu áo bạn có. Màu áo nào chưa có ảnh thì khách sẽ không chọn được màu đó cho biến thể này.
      </p>

      {designs.map((d) => (
        <DesignCard key={d.id} design={d} shirtColors={shirtColors} password={password} onChange={load} onDeleteDesign={() => handleDeleteDesign(d.id)} setError={setError} />
      ))}

      <form onSubmit={handleAddDesign} style={{ display: "flex", gap: 10, maxWidth: 460, marginTop: 10 }}>
        <input value={newDesignName} onChange={(e) => setNewDesignName(e.target.value)} placeholder="Tên mẫu in mới, ví dụ: Mèo Lười Tập Gym" required
          style={{ flex: 1, border: "2px solid var(--ink)", borderRadius: 3, padding: "10px 12px", fontFamily: "Work Sans", fontSize: 14 }} />
        <button className="xi-btn-primary" type="submit">Thêm mẫu in</button>
      </form>
    </div>
  );
}

function DesignCard({ design, shirtColors, password, onChange, onDeleteDesign, setError }) {
  const [variantName, setVariantName] = useState("");
  const [variantColor, setVariantColor] = useState("#888888");
  const [uploading, setUploading] = useState(null);

  async function handleAddVariant(e) {
    e.preventDefault();
    try {
      await adminAddVariant(password, design.id, { name: variantName, swatchHex: variantColor });
      setVariantName("");
      onChange();
    } catch (e) {
      setError(e.message);
    }
  }
  async function handleDeleteVariant(variantId) {
    if (!confirm("Xoá biến thể màu mực này và toàn bộ ảnh của nó?")) return;
    try {
      await adminDeleteVariant(password, design.id, variantId);
      onChange();
    } catch (e) {
      setError(e.message);
    }
  }
  async function handleUpload(variantId, shirtColorId, file) {
    setUploading(`${variantId}-${shirtColorId}`);
    try {
      await adminUploadVariantPhoto(password, design.id, variantId, shirtColorId, file);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  }
  async function handleDeletePhoto(variantId, shirtColorId) {
    try {
      await adminDeleteVariantPhoto(password, design.id, variantId, shirtColorId);
      onChange();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="xi-order-card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 16 }}>{design.name}</strong>
        <button className="xi-remove-btn" onClick={onDeleteDesign}><Trash2 size={16} /></button>
      </div>

      {design.variants.map((v) => (
        <div key={v.id} style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div className="xi-swatch-sm" style={{ background: v.swatchHex }} />
            <strong>{v.name}</strong>
            <button className="xi-remove-btn" onClick={() => handleDeleteVariant(v.id)} style={{ marginLeft: "auto" }}><Trash2 size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
            {shirtColors.map((c) => {
              const url = v.photos[c.id];
              const isUploading = uploading === `${v.id}-${c.id}`;
              return (
                <div key={c.id} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, marginBottom: 4 }}>{c.name}</div>
                  {url ? (
                    <div style={{ position: "relative" }}>
                      <img src={url} alt={c.name} style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6, border: "2px solid var(--line)" }} />
                      <button onClick={() => handleDeletePhoto(v.id, c.id)}
                        style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.6)", border: "none", color: "#fff", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, height: 80, border: "2px dashed var(--line)", borderRadius: 6, cursor: "pointer", fontSize: 11, color: "#8a8576" }}>
                      {isUploading ? <Loader2 size={16} className="xi-spin" /> : <Upload size={16} />}
                      Tải ảnh
                      <input type="file" accept="image/*" style={{ display: "none" }}
                        onChange={(e) => { if (e.target.files[0]) handleUpload(v.id, c.id, e.target.files[0]); }} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <form onSubmit={handleAddVariant} style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="Tên biến thể, ví dụ: Hồng - Kem" required
          style={{ flex: 1, minWidth: 200, border: "2px solid var(--ink)", borderRadius: 3, padding: "8px 10px", fontFamily: "Work Sans", fontSize: 14 }} />
        <input type="color" value={variantColor} onChange={(e) => setVariantColor(e.target.value)} />
        <button className="xi-btn-secondary" type="submit">+ Biến thể màu mực</button>
      </form>
    </div>
  );
}
