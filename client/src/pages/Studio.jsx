import { useEffect, useState } from "react";
import { ShoppingBag, Plus, Minus, Loader2 } from "lucide-react";
import ShirtCanvas from "../components/ShirtCanvas";
import { useApp }  from "../context/AppContext";
import { getShirtColors, getInkColors, getDesigns, getSettings } from "../api";
import { formatVND } from "../utils";

const SIZES = ["S", "M", "L", "XL", "XXL"];

export default function Studio() {
  const { addItem } = useApp();

  const [shirtColors, setShirtColors] = useState([]);
  const [inkColors,   setInkColors]   = useState([]);
  const [designs,     setDesigns]     = useState([]);
  const [settings,    setSettings]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const [shirtId,  setShirtId]  = useState(null);
  const [designId, setDesignId] = useState(null);
  const [inkId,    setInkId]    = useState(null);
  const [size,     setSize]     = useState("M");
  const [qty,      setQty]      = useState(1);

  useEffect(() => {
    Promise.all([getShirtColors(), getInkColors(), getDesigns(), getSettings()])
      .then(([sc, ic, d, s]) => {
        setShirtColors(sc); setInkColors(ic); setDesigns(d); setSettings(s);
        if (sc[0]) setShirtId(sc[0].id);
        if (d[0])  setDesignId(d[0].id);
        if (ic[0]) setInkId(ic[0].id);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang tải...</div>;
  if (error)   return <div className="xi-error">Không thể kết nối tới máy chủ: {error}</div>;

  const shirt  = shirtColors.find(c => c.id === shirtId);
  const design = designs.find(d => d.id === designId);
  const ink    = inkColors.find(c => c.id === inkId);
  const unitPrice = settings.basePrice + (size === "XXL" ? settings.xxlSurcharge : 0);

  function handleAdd() {
    if (!shirt || !design || !ink) return;
    addItem({
      designId:    design.id,  designName:  design.name,  designPng:   design.png,
      shirtColorId:shirt.id,   shirtName:   shirt.name,   shirtPhoto:  shirt.photo,
      inkColorId:  ink.id,     inkName:     ink.name,     inkHex:      ink.hex,
      size, qty, unitPrice,
    });
  }

  return (
    <div>
      <div className="xi-eyebrow">Áo Thun Cổ Tròn — Bản Tiêu Chuẩn</div>
      <h1 className="xi-title">Thiết Kế Áo Của Bạn</h1>
      <p className="xi-subtitle">Chọn màu áo, mẫu hình in và màu mực — xem kết quả ngay lập tức.</p>

      <div className="xi-studio-grid">
        {/* ── PREVIEW ────────────────────────────────────────── */}
        <div className="xi-preview-card" style={{ background: "#f0ede6" }}>
          {shirt ? (
            <ShirtCanvas
              shirtPhotoUrl={shirt.photo}
              designPngUrl={design?.png}
              inkHex={ink?.hex}
              size={340}
            />
          ) : (
            <div className="xi-empty">Chưa có màu áo nào. Vào /admin để thêm.</div>
          )}
        </div>

        {/* ── CONTROLS ───────────────────────────────────────── */}
        <div>

          {/* Màu áo */}
          <div className="xi-section">
            <span className="xi-label">Màu áo</span>
            <div className="xi-swatch-row">
              {shirtColors.map(c => (
                <button key={c.id} title={c.name} aria-label={c.name}
                  className={`xi-swatch ${shirtId === c.id ? "selected" : ""}`}
                  style={{ background: c.hex }}
                  onClick={() => setShirtId(c.id)} />
              ))}
            </div>
            {shirt && <div style={{ fontSize: 12, color: "#8a8576", marginTop: 6 }}>{shirt.name}</div>}
          </div>

          {/* Hình in */}
          <div className="xi-section">
            <span className="xi-label">Hình in</span>
            <div className="xi-design-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))" }}>
              {designs.length === 0 && <p style={{ fontSize: 13, color: "#8a8576" }}>Chưa có hình in nào.</p>}
              {designs.map(d => (
                <button key={d.id} className={`xi-design-thumb ${designId === d.id ? "selected" : ""}`}
                  onClick={() => setDesignId(d.id)}>
                  <img src={d.png} alt={d.name}
                    style={{ width: 48, height: 48, objectFit: "contain", filter: "invert(0) brightness(0)" }} />
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Màu mực */}
          <div className="xi-section">
            <span className="xi-label">Màu mực in</span>
            <div className="xi-swatch-row" style={{ flexWrap: "wrap" }}>
              {inkColors.map(c => (
                <button key={c.id} title={c.name}
                  className={`xi-swatch ${inkId === c.id ? "selected" : ""}`}
                  style={{
                    background: c.hex,
                    border: c.hex === "#FFFFFF" || c.hex === "#F5ECD7" ? "2px solid #ccc" : "2px solid var(--ink)"
                  }}
                  onClick={() => setInkId(c.id)} />
              ))}
            </div>
            {ink && <div style={{ fontSize: 12, color: "#8a8576", marginTop: 6 }}>{ink.name}</div>}
          </div>

          {/* Size */}
          <div className="xi-section">
            <span className="xi-label">Kích cỡ</span>
            <div className="xi-size-row">
              {SIZES.map(s => (
                <button key={s} className={`xi-size-btn ${size === s ? "selected" : ""}`}
                  onClick={() => setSize(s)}>{s}</button>
              ))}
            </div>
          </div>

          {/* Số lượng */}
          <div className="xi-section">
            <span className="xi-label">Số lượng</span>
            <div className="xi-qty">
              <button onClick={() => setQty(q => Math.max(1, q-1))}><Minus size={14}/></button>
              <span>{qty}</span>
              <button onClick={() => setQty(q => q+1)}><Plus size={14}/></button>
            </div>
          </div>

          <div className="xi-sticky-bar">
            <div>
              <div className="xi-mono" style={{ fontSize:12, color:"#8a8576" }}>Đơn giá</div>
              <div className="xi-price">{formatVND(unitPrice)}</div>
            </div>
            <button className="xi-btn-primary" onClick={handleAdd}
              disabled={!shirt || !design || !ink}>
              <ShoppingBag size={18}/> Thêm vào giỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
