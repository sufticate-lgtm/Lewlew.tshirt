import { useEffect, useState } from "react";
import { ShoppingBag, Plus, Minus, Loader2, ImageOff } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getShirtColors, getDesigns, getSettings } from "../api";
import { formatVND } from "../utils";

const SIZES = ["S", "M", "L", "XL", "XXL"];

export default function Studio() {
  const { addItem } = useApp();

  const [shirtColors, setShirtColors] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [designId, setDesignId] = useState(null);
  const [variantId, setVariantId] = useState(null);
  const [shirtColorId, setShirtColorId] = useState(null);
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [sc, d, s] = await Promise.all([getShirtColors(), getDesigns(), getSettings()]);
        setShirtColors(sc);
        setDesigns(d);
        setSettings(s);
        const firstDesign = d.find((x) => x.variants.length > 0);
        if (firstDesign) {
          setDesignId(firstDesign.id);
          const firstVariant = firstDesign.variants.find((v) => Object.keys(v.photos).length > 0) || firstDesign.variants[0];
          setVariantId(firstVariant.id);
          setShirtColorId(Object.keys(firstVariant.photos)[0] || null);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang tải dữ liệu...</div>;
  if (error) return <div className="xi-error">Không thể kết nối tới máy chủ: {error}.</div>;
  if (!designId) return <div className="xi-empty"><p>Chưa có mẫu in nào. Vào trang quản trị (/admin) để thêm mẫu in và ảnh.</p></div>;

  const design = designs.find((d) => d.id === designId);
  const variant = design.variants.find((v) => v.id === variantId) || design.variants[0];
  const photoUrl = variant?.photos?.[shirtColorId];
  const shirt = shirtColors.find((c) => c.id === shirtColorId);
  const unitPrice = settings.basePrice + (size === "XXL" ? settings.xxlSurcharge : 0);

  function selectDesign(d) {
    setDesignId(d.id);
    const v = d.variants.find((v) => Object.keys(v.photos).length > 0) || d.variants[0];
    setVariantId(v?.id || null);
    setShirtColorId(Object.keys(v?.photos || {})[0] || null);
  }
  function selectVariant(v) {
    setVariantId(v.id);
    const availableIds = Object.keys(v.photos);
    if (!availableIds.includes(shirtColorId)) setShirtColorId(availableIds[0] || null);
  }

  function handleAddToCart() {
    addItem({
      designId: design.id,
      designName: design.name,
      variantId: variant.id,
      variantName: variant.name,
      shirtColorId: shirt.id,
      shirtName: shirt.name,
      photo: photoUrl,
      size,
      qty,
      unitPrice,
    });
  }

  return (
    <div>
      <div className="xi-eyebrow">Áo Thun Cổ Tròn — Bản Tiêu Chuẩn</div>
      <h1 className="xi-title">Thiết Kế Áo Của Bạn</h1>
      <p className="xi-subtitle">Chọn mẫu in, màu mực in và màu áo — tất cả đều là ảnh thật do xưởng chụp sẵn.</p>
      <div className="xi-studio-grid">
        <div className="xi-preview-card">
          {photoUrl ? (
            <img src={photoUrl} alt={`${design.name} - ${variant?.name} - ${shirt?.name}`} style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }} />
          ) : (
            <div style={{ textAlign: "center", color: "#8a8576" }}>
              <ImageOff size={32} />
              <p>Chưa có ảnh cho lựa chọn này</p>
            </div>
          )}
        </div>

        <div>
          <div className="xi-section">
            <span className="xi-label">Mẫu in</span>
            <div className="xi-design-grid">
              {designs.map((d) => {
                const thumbVariant = d.variants.find((v) => Object.keys(v.photos).length > 0);
                const thumbUrl = thumbVariant ? Object.values(thumbVariant.photos)[0] : null;
                return (
                  <button key={d.id} className={`xi-design-thumb ${designId === d.id ? "selected" : ""}`} onClick={() => selectDesign(d)}>
                    {thumbUrl ? <img src={thumbUrl} alt={d.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }} /> : <ImageOff size={20} />}
                    <span>{d.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xi-section">
            <span className="xi-label">Màu mực in</span>
            <div className="xi-swatch-row">
              {design.variants.map((v) => (
                <button key={v.id} title={v.name}
                  className={`xi-swatch ${variantId === v.id ? "selected" : ""}`}
                  style={{ background: v.swatchHex }}
                  onClick={() => selectVariant(v)} />
              ))}
            </div>
          </div>

          <div className="xi-section">
            <span className="xi-label">Màu áo</span>
            <div className="xi-swatch-row">
              {shirtColors.map((c) => {
                const available = !!variant?.photos?.[c.id];
                return (
                  <button key={c.id} title={available ? c.name : `${c.name} (chưa có ảnh)`}
                    disabled={!available}
                    className={`xi-swatch ${shirtColorId === c.id ? "selected" : ""}`}
                    style={{ background: c.hex, opacity: available ? 1 : 0.25, cursor: available ? "pointer" : "not-allowed" }}
                    onClick={() => available && setShirtColorId(c.id)} />
                );
              })}
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
            <button className="xi-btn-primary" onClick={handleAddToCart} disabled={!photoUrl}><ShoppingBag size={18} /> Thêm vào giỏ</button>
          </div>
        </div>
      </div>
    </div>
  );
}
