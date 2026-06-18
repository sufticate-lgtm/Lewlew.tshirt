import { useEffect, useState } from "react";
import { Trash2, Loader2, LogOut } from "lucide-react";
import {
  adminLogin, adminGetOrders, adminUpdateOrderStatus,
  getShirtColors, getPrintColors, getDesigns,
  adminAddShirtColor, adminDeleteShirtColor,
  adminAddPrintColor, adminDeletePrintColor,
  adminAddDesign, adminDeleteDesign,
} from "../api";
import { formatVND } from "../shirtShape";

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
        <button className={tab === "printColors" ? "active" : ""} onClick={() => setTab("printColors")}>Màu hình in</button>
        <button className={tab === "designs" ? "active" : ""} onClick={() => setTab("designs")}>Mẫu in</button>
      </div>
      {tab === "orders" && <OrdersTab password={password} />}
      {tab === "shirtColors" && <ColorsTab password={password} kind="shirt" />}
      {tab === "printColors" && <ColorsTab password={password} kind="print" />}
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
              <div key={idx}>{it.designId} · {it.shirtColorId} · {it.size} x{it.qty}</div>
            ))}
            <div>Địa chỉ: {o.customer.address}</div>
            <div>Thanh toán: {o.payment === "cod" ? "COD" : o.payment === "bank" ? "Chuyển khoản" : "Momo/ZaloPay"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ColorsTab({ password, kind }) {
  const isShirt = kind === "shirt";
  const fetchFn = isShirt ? getShirtColors : getPrintColors;
  const addFn = isShirt ? adminAddShirtColor : adminAddPrintColor;
  const deleteFn = isShirt ? adminDeleteShirtColor : adminDeletePrintColor;

  const [list, setList] = useState(null);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#888888");
  const [error, setError] = useState(null);

  function load() {
    fetchFn().then(setList).catch((e) => setError(e.message));
  }
  useEffect(load, [kind]);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    try {
      await addFn(password, { name, hex });
      setName("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function handleDelete(id) {
    try {
      await deleteFn(password, id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="xi-error">{error}</div>;
  if (!list) return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang tải...</div>;

  return (
    <div>
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
        <div className="xi-field"><label>Mã màu</label><input type="color" value={hex} onChange={(e) => setHex(e.target.value)} /></div>
        <button type="submit" className="xi-btn-primary" style={{ gridColumn: "1/-1", justifyContent: "center" }}>Thêm màu</button>
      </form>
    </div>
  );
}

function DesignsTab({ password }) {
  const [designs, setDesigns] = useState(null);
  const [printColors, setPrintColors] = useState([]);
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [svg, setSvg] = useState('<g>\n  <circle cx="100" cy="100" r="60" fill="__PRIMARY__" stroke="__SECONDARY__" stroke-width="6"/>\n</g>');
  const [error, setError] = useState(null);

  function load() {
    Promise.all([getDesigns(), getPrintColors()]).then(([d, p]) => {
      setDesigns(d);
      setPrintColors(p);
      if (!primary && p[0]) setPrimary(p[0].id);
      if (!secondary && p[1]) setSecondary(p[1].id);
    }).catch((e) => setError(e.message));
  }
  useEffect(load, [password]);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    try {
      await adminAddDesign(password, { name, svg, defaultColors: { primary, secondary } });
      setName("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function handleDelete(id) {
    try {
      await adminDeleteDesign(password, id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="xi-error">{error}</div>;
  if (!designs) return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang tải...</div>;

  const primaryHex = printColors.find((c) => c.id === primary)?.hex || "#888";
  const secondaryHex = printColors.find((c) => c.id === secondary)?.hex || "#ccc";

  return (
    <div>
      <div className="xi-design-grid" style={{ marginBottom: 24 }}>
        {designs.map((d) => {
          const pHex = printColors.find((c) => c.id === d.defaultColors.primary)?.hex || "#888";
          const sHex = printColors.find((c) => c.id === d.defaultColors.secondary)?.hex || "#ccc";
          return (
            <div key={d.id} className="xi-design-thumb">
              <svg width="48" height="48" viewBox="0 0 200 200"
                dangerouslySetInnerHTML={{ __html: d.svg.replaceAll("__PRIMARY__", pHex).replaceAll("__SECONDARY__", sHex) }} />
              <span>{d.name}</span>
              <button className="xi-remove-btn" onClick={() => handleDelete(d.id)}><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAdd}>
        <p className="xi-subtitle">
          Mẫu in mới: dán mã SVG (chỉ phần bên trong, không cần thẻ &lt;svg&gt;) dùng <code>__PRIMARY__</code> và{" "}
          <code>__SECONDARY__</code> thay cho màu — khách hàng sẽ đổi hai màu này bằng bảng màu in.
        </p>
        <div className="xi-form-grid" style={{ marginBottom: 14 }}>
          <div className="xi-field"><label>Tên mẫu</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="xi-field">
            <label>Màu chính mặc định</label>
            <select value={primary} onChange={(e) => setPrimary(e.target.value)}>
              {printColors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="xi-field">
            <label>Màu phụ mặc định</label>
            <select value={secondary} onChange={(e) => setSecondary(e.target.value)}>
              {printColors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="xi-field">
            <label>Xem trước</label>
            <svg width="48" height="48" viewBox="0 0 200 200" style={{ background: "#fff", border: "2px solid var(--line)", borderRadius: 6 }}
              dangerouslySetInnerHTML={{ __html: svg.replaceAll("__PRIMARY__", primaryHex).replaceAll("__SECONDARY__", secondaryHex) }} />
          </div>
        </div>
        <div className="xi-field" style={{ marginBottom: 14 }}>
          <label>Mã SVG</label>
          <textarea rows="6" value={svg} onChange={(e) => setSvg(e.target.value)} style={{ fontFamily: "JetBrains Mono", fontSize: 13 }} required />
        </div>
        <button type="submit" className="xi-btn-primary">Thêm mẫu in</button>
      </form>
    </div>
  );
}
