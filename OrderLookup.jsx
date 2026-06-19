import { useEffect, useState, useMemo } from "react";
import { ShoppingBag, Plus, Minus, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import ShirtCanvas from "../components/ShirtCanvas";
import { useApp }  from "../context/AppContext";
import { getShirtColors, getInkColors, getDesigns, getSettings } from "../api";
import { formatVND } from "../utils";

const SIZES = ["S","M","L","XL","XXL"];
const ZOOM_STEPS = [1, 1.5, 2];

export default function Studio() {
  const { addItem } = useApp();

  const [shirtColors, setShirtColors] = useState([]);
  const [inkColors,   setInkColors]   = useState([]);
  const [designs,     setDesigns]     = useState([]);
  const [settings,    setSettings]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const [shirtId,      setShirtId]      = useState(null);
  const [designId,     setDesignId]     = useState(null);
  const [layerColors,  setLayerColors]  = useState({}); // {layerId: inkColorId}
  const [size,         setSize]         = useState("M");
  const [qty,          setQty]          = useState(1);
  const [zoomIdx,      setZoomIdx]      = useState(0);

  useEffect(() => {
    Promise.all([getShirtColors(), getInkColors(), getDesigns(), getSettings()])
      .then(([sc,ic,d,s]) => {
        setShirtColors(sc); setInkColors(ic); setDesigns(d); setSettings(s);
        if (sc[0]) setShirtId(sc[0].id);
        if (d[0])  {
          setDesignId(d[0].id);
          const defaults = {};
          d[0].layers.forEach(l => { defaults[l.id] = l.defaultInkId || (ic[0]?.id); });
          setLayerColors(defaults);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function selectDesign(d) {
    setDesignId(d.id);
    const defaults = {};
    d.layers.forEach(l => { defaults[l.id] = l.defaultInkId || (inkColors[0]?.id); });
    setLayerColors(defaults);
  }

  const shirt   = shirtColors.find(c => c.id === shirtId);
  const design  = designs.find(d => d.id === designId);
  const zoom    = ZOOM_STEPS[zoomIdx];

  // Build layers array cho ShirtCanvas
  const canvasLayers = useMemo(() => {
    if (!design) return [];
    return design.layers.map(l => ({
      ...l,
      inkHex: inkColors.find(c => c.id === (layerColors[l.id] || l.defaultInkId))?.hex || "#000000",
    }));
  }, [design, layerColors, inkColors]);

  const unitPrice = settings ? settings.basePrice + (size==="XXL"?settings.xxlSurcharge:0) : 0;

  function handleAdd() {
    if (!shirt||!design) return;
    addItem({
      designId:    design.id,  designName:  design.name,
      printArea:   design.printArea,
      shirtColorId:shirt.id,  shirtName:  shirt.name,  shirtPhoto: shirt.photo,
      layerColors: design.layers.map(l => ({
        layerId:    l.id,
        inkColorId: layerColors[l.id] || l.defaultInkId,
        inkHex:     inkColors.find(c=>c.id===(layerColors[l.id]||l.defaultInkId))?.hex||"#000",
        inkName:    inkColors.find(c=>c.id===(layerColors[l.id]||l.defaultInkId))?.name||"",
        png:        l.png,
        layerName:  l.name,
      })),
      size, qty, unitPrice,
    });
  }

  if (loading) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang tải...</div>;
  if (error)   return <div className="xi-error">Lỗi kết nối: {error}</div>;

  return (
    <div>
      <div className="xi-eyebrow">Áo Thun Cổ Tròn</div>
      <h1 className="xi-title">Thiết Kế Áo Của Bạn</h1>
      <p className="xi-subtitle">Chọn màu áo, mẫu in và màu từng lớp mực — xem preview ngay lập tức.</p>

      <div className="xi-studio-grid">
        {/* ── PREVIEW + ZOOM ──────────────────────────────── */}
        <div>
          <div className="xi-preview-card" style={{ background:"#e8e5de", minHeight:380, padding:0, overflow:"auto" }}>
            {shirt ? (
              <ShirtCanvas
                shirtPhotoUrl={shirt.photo}
                layers={canvasLayers}
                printArea={design?.printArea}
                zoom={zoom}
                size={460}
              />
            ) : (
              <div className="xi-empty">Chưa có màu áo nào.</div>
            )}
          </div>
          {/* Nút zoom */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, justifyContent:"center" }}>
            <button className="xi-btn-secondary" style={{padding:"6px 12px"}}
              onClick={() => setZoomIdx(i=>Math.max(0,i-1))} disabled={zoomIdx===0}>
              <ZoomOut size={16}/>
            </button>
            <span style={{fontSize:13,color:"#6b675c",minWidth:50,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
            <button className="xi-btn-secondary" style={{padding:"6px 12px"}}
              onClick={() => setZoomIdx(i=>Math.min(ZOOM_STEPS.length-1,i+1))} disabled={zoomIdx===ZOOM_STEPS.length-1}>
              <ZoomIn size={16}/>
            </button>
          </div>
        </div>

        {/* ── CONTROLS ────────────────────────────────────── */}
        <div>
          {/* Màu áo */}
          <div className="xi-section">
            <span className="xi-label">Màu áo</span>
            <div className="xi-swatch-row">
              {shirtColors.map(c => (
                <button key={c.id} title={c.name}
                  className={`xi-swatch ${shirtId===c.id?"selected":""}`}
                  style={{ background:c.hex, border: c.hex==="#FFFFFF"||c.hex==="#F5ECD7"?"2px solid #ccc":"2px solid var(--ink)" }}
                  onClick={() => setShirtId(c.id)}/>
              ))}
            </div>
            {shirt && <div style={{fontSize:12,color:"#8a8576",marginTop:5}}>{shirt.name}</div>}
          </div>

          {/* Hình in */}
          <div className="xi-section">
            <span className="xi-label">Hình in</span>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {designs.map(d => (
                <button key={d.id} className={`xi-design-thumb ${designId===d.id?"selected":""}`}
                  onClick={() => selectDesign(d)}
                  style={{minWidth:70}}>
                  {d.layers[0] && (
                    <img src={d.layers[0].png} alt={d.name}
                      style={{width:44,height:44,objectFit:"contain",filter:"brightness(0)"}}/>
                  )}
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Màu mực theo từng layer */}
          {design?.layers.map((layer, idx) => (
            <div key={layer.id} className="xi-section">
              <span className="xi-label">
                {design.layers.length>1 ? `Màu mực — ${layer.name}` : "Màu mực in"}
              </span>
              <div className="xi-swatch-row" style={{flexWrap:"wrap"}}>
                {inkColors.map(c => (
                  <button key={c.id} title={c.name}
                    className={`xi-swatch ${(layerColors[layer.id]||layer.defaultInkId)===c.id?"selected":""}`}
                    style={{ background:c.hex, border: c.hex==="#FFFFFF"||c.hex==="#F5ECD7"?"2px solid #ccc":"2px solid var(--ink)" }}
                    onClick={() => setLayerColors(lc=>({...lc,[layer.id]:c.id}))}/>
                ))}
              </div>
              {inkColors.find(c=>c.id===(layerColors[layer.id]||layer.defaultInkId)) && (
                <div style={{fontSize:12,color:"#8a8576",marginTop:5}}>
                  {inkColors.find(c=>c.id===(layerColors[layer.id]||layer.defaultInkId))?.name}
                </div>
              )}
            </div>
          ))}

          {/* Size */}
          <div className="xi-section">
            <span className="xi-label">Kích cỡ</span>
            <div className="xi-size-row">
              {SIZES.map(s => (
                <button key={s} className={`xi-size-btn ${size===s?"selected":""}`}
                  onClick={()=>setSize(s)}>{s}</button>
              ))}
            </div>
          </div>

          {/* Số lượng */}
          <div className="xi-section">
            <span className="xi-label">Số lượng</span>
            <div className="xi-qty">
              <button onClick={()=>setQty(q=>Math.max(1,q-1))}><Minus size={14}/></button>
              <span>{qty}</span>
              <button onClick={()=>setQty(q=>q+1)}><Plus size={14}/></button>
            </div>
          </div>

          <div className="xi-sticky-bar">
            <div>
              <div className="xi-mono" style={{fontSize:12,color:"#8a8576"}}>Đơn giá</div>
              <div className="xi-price">{formatVND(unitPrice)}</div>
            </div>
            <button className="xi-btn-primary" onClick={handleAdd}
              disabled={!shirt||!design}>
              <ShoppingBag size={18}/> Thêm vào giỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
