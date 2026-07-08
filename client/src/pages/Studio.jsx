import { useEffect, useState, useMemo } from "react";
import { ShoppingBag, Plus, Minus, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import ShirtCanvas from "../components/ShirtCanvas";
import { useApp }  from "../context/AppContext";
import { getShirtColors, getInkColors, getDesigns, getSettings } from "../api";
import { formatVND } from "../utils";

const SIZES = ["S","M","L","XL","XXL"];

export default function Studio() {
  const { addItem } = useApp();
  const [shirtColors, setShirtColors] = useState([]);
  const [inkColors,   setInkColors]   = useState([]);
  const [designs,     setDesigns]     = useState([]);
  const [settings,    setSettings]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [shirtId,     setShirtId]     = useState(null);
  const [designId,    setDesignId]    = useState(null);
  const [layerColors, setLayerColors] = useState({});
  const [size,        setSize]        = useState("M");
  const [qty,         setQty]         = useState(1);
  const [zoom,        setZoom]        = useState(1);
  const [view,        setView]        = useState("front");
  const [hoveredInk,  setHoveredInk]  = useState(null); // {layerId, inkId}

  useEffect(() => {
    Promise.all([getShirtColors(), getInkColors(), getDesigns(), getSettings()])
      .then(([sc,ic,d,s]) => {
        setShirtColors(sc); setInkColors(ic); setDesigns(d); setSettings(s);
        if (sc[0]) setShirtId(sc[0].id);
        if (d[0])  { setDesignId(d[0].id); initDefaults(d[0], ic); }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function initDefaults(d, ic) {
    const defaults = {};
    d.layers.forEach(l => { defaults[l.id] = l.defaultInkId || ic[0]?.id; });
    setLayerColors(defaults);
  }
  function selectDesign(d) { setDesignId(d.id); initDefaults(d, inkColors); }
  function selectShirt(id) { setShirtId(id); setView("front"); }

  const shirt   = shirtColors.find(c => c.id === shirtId);
  const design  = designs.find(d => d.id === designId);
  const hasBack = !!shirt?.photoBack;
  const currentPhoto = view === "back" && hasBack ? shirt.photoBack : shirt?.photo;

  const canvasLayers = useMemo(() => {
    if (!design) return [];
    if (view === "back" && !design.printAreaBack) return [];
    return design.layers
      .filter(l => {
        const s = l.side || "front";
        if (view === "front") return s === "front" || s === "both";
        if (view === "back")  return s === "back"  || s === "both";
        return true;
      })
      .map(l => ({
        ...l,
        inkHex: inkColors.find(c => c.id === (layerColors[l.id] || l.defaultInkId))?.hex || "#000",
      }));
  }, [design, layerColors, inkColors, view]);

  // printArea theo view
  const currentPrintArea = view === "back" && design?.printAreaBack
    ? design.printAreaBack
    : design?.printArea;

  const unitPrice = settings ? settings.basePrice + (size==="XXL"?settings.xxlSurcharge:0) : 0;

  function handleAdd() {
    if (!shirt||!design) return;
    addItem({
      designId: design.id, designName: design.name, printArea: design.printArea,
      shirtColorId: shirt.id, shirtName: shirt.name, shirtPhoto: shirt.photo,
      layerColors: design.layers.map(l => ({
        layerId: l.id, layerName: l.name, png: l.png,
        inkColorId: layerColors[l.id] || l.defaultInkId,
        inkHex: inkColors.find(c=>c.id===(layerColors[l.id]||l.defaultInkId))?.hex || "#000",
        inkName: inkColors.find(c=>c.id===(layerColors[l.id]||l.defaultInkId))?.name || "",
      })),
      size, qty, unitPrice,
    });
  }

  if (loading) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang tải...</div>;
  if (error)   return <div className="xi-error">Lỗi: {error}</div>;

  return (
    <div className="studio-wrap">
      {/* ── PREVIEW ──────────────────────────────────── */}
      <div className="studio-preview">
        <div className="studio-canvas-box"
          style={{ transform:`scale(${zoom})`, transformOrigin:"center center" }}>
          {shirt ? (
            <ShirtCanvas shirtPhotoUrl={currentPhoto} layers={canvasLayers}
              printArea={currentPrintArea}/>
          ) : (
            <div className="xi-empty" style={{height:"100%",display:"flex",
              alignItems:"center",justifyContent:"center"}}>Chưa có màu áo.</div>
          )}
        </div>

        {/* Nút Trước/Sau */}
        {hasBack && (
          <div style={{position:"absolute",top:16,left:"50%",transform:"translateX(-50%)",
            display:"flex",background:"rgba(255,255,255,.92)",borderRadius:24,
            border:"2px solid var(--ink)",overflow:"hidden"}}>
            {["front","back"].map((v,i) => (
              <button key={v} onClick={()=>setView(v)} style={{
                padding:"7px 18px",border:"none",fontWeight:700,fontSize:13,
                background:view===v?"var(--ink)":"transparent",
                color:view===v?"#fff":"var(--ink)",cursor:"pointer",
              }}>{i===0?"Mặt trước":"Mặt sau"}</button>
            ))}
          </div>
        )}

        {/* Zoom */}
        <div className="studio-zoom">
          <button onClick={()=>setZoom(z=>Math.max(0.5,+(z-.25).toFixed(2)))}
            disabled={zoom<=0.5}><ZoomOut size={16}/></button>
          <span>{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.min(2.5,+(z+.25).toFixed(2)))}
            disabled={zoom>=2.5}><ZoomIn size={16}/></button>
        </div>
      </div>

      {/* ── CONTROLS ─────────────────────────────────── */}
      <div className="studio-controls">
        <div className="xi-eyebrow">Áo Thun Cổ Tròn</div>
        <h1 className="xi-title" style={{fontSize:22,marginBottom:16}}>Thiết Kế Áo</h1>

        {/* Màu áo */}
        <div className="xi-section">
          <span className="xi-label">Màu áo
            {shirt && <span style={{fontWeight:400,marginLeft:8,fontSize:11,
              color:"#8a8576",textTransform:"none"}}>{shirt.name}</span>}
          </span>
          <div className="xi-swatch-row" style={{flexWrap:"wrap",gap:6}}>
            {shirtColors.map(c => (
              <button key={c.id} title={c.name}
                className={`xi-swatch ${shirtId===c.id?"selected":""}`}
                style={{width:28,height:28,background:c.hex,
                  border:["#FFFFFF","#F5ECD7"].includes(c.hex)?"2px solid #ccc":"2px solid var(--ink)"}}
                onClick={() => selectShirt(c.id)}/>
            ))}
          </div>
        </div>

        {/* Hình in */}
        {designs.length > 1 && (
          <div className="xi-section">
            <span className="xi-label">Hình in</span>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {designs.map(d => (
                <button key={d.id}
                  className={`xi-design-thumb ${designId===d.id?"selected":""}`}
                  onClick={() => selectDesign(d)} style={{minWidth:60}}>
                  {d.layers[0] && (
                    <img src={d.layers[0].png} alt={d.name}
                      style={{width:36,height:36,objectFit:"contain",filter:"brightness(0)"}}/>
                  )}
                  <span style={{fontSize:10}}>{d.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Màu mực — compact layout cho nhiều layer */}
        {design?.layers.length > 0 && (
          <div className="xi-section">
            <span className="xi-label">Màu mực</span>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {design.layers.map(layer => {
                const selectedInk = inkColors.find(c=>c.id===(layerColors[layer.id]||layer.defaultInkId));
                const hovered = hoveredInk?.layerId===layer.id
                  ? inkColors.find(c=>c.id===hoveredInk.inkId) : null;
                const displayInk = hovered || selectedInk;

                return (
                  <div key={layer.id} style={{
                    background:"#fff",border:"1.5px solid var(--line)",
                    borderRadius:8,padding:"10px 12px",
                  }}>
                    {/* Tên layer + màu đang chọn */}
                    <div style={{display:"flex",alignItems:"center",
                      justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:12,fontWeight:700,
                        maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",
                        whiteSpace:"nowrap",color:"#3a3830"}}>
                        {layer.name}
                      </span>
                      {displayInk && (
                        <span style={{display:"flex",alignItems:"center",gap:5,
                          fontSize:11,color:"#6b675c",flexShrink:0}}>
                          <span style={{width:14,height:14,borderRadius:"50%",
                            background:displayInk.hex,border:"1.5px solid #ccc",
                            display:"inline-block",flexShrink:0}}/>
                          {displayInk.name}
                        </span>
                      )}
                    </div>
                    {/* Swatches nhỏ gọn */}
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {inkColors.map(c => {
                        const isSelected = (layerColors[layer.id]||layer.defaultInkId)===c.id;
                        return (
                          <button key={c.id} title={c.name}
                            onMouseEnter={()=>setHoveredInk({layerId:layer.id,inkId:c.id})}
                            onMouseLeave={()=>setHoveredInk(null)}
                            onClick={()=>setLayerColors(lc=>({...lc,[layer.id]:c.id}))}
                            style={{
                              width:26,height:26,borderRadius:"50%",
                              background:c.hex,cursor:"pointer",padding:0,
                              border:isSelected?"3px solid var(--ink)":
                                c.hex==="#FFFFFF"?"2px solid #ccc":"2px solid transparent",
                              boxShadow:isSelected?"0 0 0 1px var(--paper)":"none",
                              transform:isSelected?"scale(1.15)":"scale(1)",
                              transition:"transform .12s",
                            }}/>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
            <div className="xi-mono" style={{fontSize:11,color:"#8a8576"}}>Đơn giá</div>
            <div className="xi-price">{formatVND(unitPrice)}</div>
          </div>
          <button className="xi-btn-primary" onClick={handleAdd} disabled={!shirt||!design}>
            <ShoppingBag size={18}/> Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  );
}
