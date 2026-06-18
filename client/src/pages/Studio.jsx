import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Plus, Minus, Loader2 } from "lucide-react";
import ShirtPreview from "../components/ShirtPreview";
import { useApp } from "../context/AppContext";
import { getShirtColors, getPrintColors, getDesigns, getSettings } from "../api";
import { formatVND } from "../shirtShape";

const SIZES = ["S", "M", "L", "XL", "XXL"];

export default function Studio() {
  const { addItem } = useApp();
  const navigate = useNavigate();

  const [shirtColors, setShirtColors] = useState([]);
  const [printColors, setPrintColors] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [shirtColorId, setShirtColorId] = useState(null);
  const [designId, setDesignId] = useState(null);
  const [designColors, setDesignColors] = useState({ primary: null, secondary: null });
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [swipeKey, setSwipeKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [sc, pc, d, s] = await Promise.all([getShirtColors(), getPrintColors(), getDesigns(), getSettings()]);
        setShirtColors(sc);
        setPrintColors(pc);
        setDesigns(d);
        setSettings(s);
        if (sc[0]) setShirtColorId(sc[0].id);
        if (d[0]) {
          setDesignId(d[0].id);
          setDesignColors(d[0].defaultColors);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setSwipeKey((k) => k + 1);
  }, [shirtColorId, designColors.primary, designColors.secondary, designId]);

  if (loading) {
    return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang tải dữ liệu...</div>;
  }
  if (error) {
    return <div className="xi-error">Không thể kết nối tới máy chủ: {error}. Kiểm tra server đang chạy ở http://localhost:4000.</div>;
  }

  const design = designs.find((d) => d.id === designId);
  const shirt = shirtColors.find((c) => c.id === shirtColorId);
  const primaryColor = printColors.find((c) => c.id === designColors.primary);
  const secondaryColor = printColors.find((c) => c.id === designColors.secondary);
  const resolved = { primary: primaryColor?.hex, secondary: secondaryColor?.hex };
  const unitPrice = settings.basePrice + (size === "XXL" ? settings.xxlSurcharge : 0);

  function handleAddToCart() {
    addItem({
      shirtColorId: shirt.id,
      shirtName: shirt.name,
      shirtHex: shirt.hex,
      designId: design.id,
      designName: design.name,
      designSvg: design.svg,
      colors: { primary: primaryColor.id, secondary: secondaryColor.id },
      colorsHex: { primary: primaryColor.hex, secondary: secondaryColor.hex },
      size,
      qty,
      unitPrice,
    });
  }

  return (
    <div>
      <div className="xi-eyebrow">Áo Thun Cổ Tròn — Bản Tiêu Chuẩn</div>
      <h1 className="xi-title">Thiết Kế Áo Của Bạn</h1>
      <p className="xi-subtitle">
        Chọn màu áo và màu mẫu in theo bảng màu của xưởng. Mẫu in đã được chuẩn bị sẵn — bạn không cần tải ảnh lên.
      </p>
      <div className="xi-studio-grid">
        <div className="xi-preview-card">
          <div key={swipeKey} className="xi-swipe-bar" />
          <ShirtPreview shirtHex={shirt.hex} designSvg={design.svg} colors={resolved} size={280} />
        </div>

        <div>
          <div className="xi-section">
            <span className="xi-label">Màu áo</span>
            <div className="xi-swatch-row">
              {shirtColors.map((c) => (
                <button key={c.id} title={c.name} aria-label={c.name}
                  className={`xi-swatch ${shirtColorId === c.id ? "selected" : ""}`}
                  style={{ background: c.hex }} onClick={() => setShirtColorId(c.id)} />
              ))}
            </div>
          </div>

          <div className="xi-section">
            <span className="xi-label">Mẫu in</span>
            <div className="xi-design-grid">
              {designs.map((d) => {
                const dr = {
                  primary: printColors.find((c) => c.id === d.defaultColors.primary)?.hex,
                  secondary: printColors.find((c) => c.id === d.defaultColors.secondary)?.hex,
                };
                return (
                  <button key={d.id} className={`xi-design-thumb ${designId === d.id ? "selected" : ""}`}
                    onClick={() => { setDesignId(d.id); setDesignColors(d.defaultColors); }}>
                    <svg width="48" height="48" viewBox="0 0 200 200"
                      dangerouslySetInnerHTML={{
                        __html: d.svg
                          .replaceAll("__PRIMARY__", designId === d.id ? resolved.primary : dr.primary)
                          .replaceAll("__SECONDARY__", designId === d.id ? resolved.secondary : dr.secondary),
                      }} />
                    <span>{d.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xi-section">
            <span className="xi-label">Màu hình in — màu chính</span>
            <div className="xi-swatch-row">
              {printColors.map((c) => (
                <button key={c.id} title={c.name}
                  className={`xi-swatch ${designColors.primary === c.id ? "selected" : ""}`}
                  style={{ background: c.hex }}
                  onClick={() => setDesignColors((p) => ({ ...p, primary: c.id }))} />
              ))}
            </div>
          </div>

          <div className="xi-section">
            <span className="xi-label">Màu hình in — màu phụ</span>
            <div className="xi-swatch-row">
              {printColors.map((c) => (
                <button key={c.id} title={c.name}
                  className={`xi-swatch ${designColors.secondary === c.id ? "selected" : ""}`}
                  style={{ background: c.hex }}
                  onClick={() => setDesignColors((p) => ({ ...p, secondary: c.id }))} />
              ))}
            </div>
          </div>

          <div className="xi-section">
            <span className="xi-label">Kích cỡ</span>
            <div className="xi-size-row">
              {SIZES.map((s) => (
                <button key={s} className={`xi-size-btn ${size === s ? "selected" : ""}`} onClick={() => setSize(s)}>{s}</button>
              ))}
            </div>
          </div>

          <div className="xi-section">
            <span className="xi-label">Số lượng</span>
            <div className="xi-qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={14} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)}><Plus size={14} /></button>
            </div>
          </div>

          <div className="xi-sticky-bar">
            <div>
              <div className="xi-mono" style={{ fontSize: 12, color: "#8a8576" }}>Đơn giá</div>
              <div className="xi-price">{formatVND(unitPrice)}</div>
            </div>
            <button className="xi-btn-primary" onClick={handleAddToCart}><ShoppingBag size={18} /> Thêm vào giỏ</button>
          </div>
        </div>
      </div>
    </div>
  );
}
