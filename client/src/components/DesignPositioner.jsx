/**
 * DesignPositioner — định vị hình in trong Admin.
 * Dùng ảnh áo trơn làm nền, chồng thước lên trên.
 * Hộp cam khớp tỉ lệ PNG thực tế.
 * Tab Mặt trước / Mặt sau độc lập hoàn toàn.
 */
import { useRef, useState, useEffect } from "react";

const RULER_FRONT   = "/seed-uploads/ruler-front.png";
const RULER_BACK    = "/seed-uploads/ruler-back.png";
const RULER_OPACITY = 0.55;

export default function DesignPositioner({
  shirtPhotoUrl, shirtPhotoBackUrl,
  designLayers, printArea, printAreaBack,
  calibration, onChangeFront, onChangeBack,
}) {
  const containerRef = useRef(null);
  const [side,     setSide]     = useState("front");
  const [dragging, setDragging] = useState(null);
  const [start,    setStart]    = useState(null);
  const [ratio,    setRatio]    = useState(1);

  const fpc       = calibration?.fracPerCm || 0.0191;
  const currentPA = side === "front" ? printArea : (printAreaBack || {cx:0.50,cy:0.37,w:printArea.w});
  const onChange  = side === "front" ? onChangeFront : onChangeBack;
  const rulerUrl  = side === "back" ? RULER_BACK : RULER_FRONT;
  const photoUrl  = side === "back" ? (shirtPhotoBackUrl||shirtPhotoUrl) : shirtPhotoUrl;
  const hasBack   = !!shirtPhotoBackUrl;

  const curW = currentPA.w || 0.32;
  const curH = curW * ratio;

  const [wInput, setWInput] = useState((curW / fpc).toFixed(1));
  const [hInput, setHInput] = useState((curH / fpc).toFixed(1));

  // Sync inputs khi thay đổi
  useEffect(() => {
    const w = currentPA.w || 0.32;
    setWInput((w / fpc).toFixed(1));
    setHInput((w * ratio / fpc).toFixed(1));
  }, [side, currentPA.w, ratio, fpc]);

  // Đọc tỉ lệ PNG
  useEffect(() => {
    const visibleLayers = (designLayers||[]).filter(l => {
      const s = l.side || 'front';
      return side === 'front' ? (s === 'front' || s === 'both') : (s === 'back' || s === 'both');
    });
    const png = visibleLayers[0]?.png || designLayers?.[0]?.png;
    if (!png) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0) setRatio(img.naturalHeight / img.naturalWidth);
    };
    img.src = png;
  }, [designLayers, side]);

  // Apply từ input W → H tự theo tỉ lệ
  function applyW(val) {
    const cm = parseFloat(val);
    if (!isNaN(cm) && cm > 0) {
      onChange({...currentPA, w: cm * fpc});
      setHInput((cm * ratio).toFixed(1));
    }
  }
  // Apply từ input H → W tự theo tỉ lệ
  function applyH(val) {
    const cm = parseFloat(val);
    if (!isNaN(cm) && cm > 0 && ratio > 0) {
      onChange({...currentPA, w: (cm / ratio) * fpc});
      setWInput((cm / ratio).toFixed(1));
    }
  }

  function getRelPos(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) / rect.width, y: (cy - rect.top) / rect.height };
  }

  function onMouseDown(e, type) {
    e.preventDefault(); e.stopPropagation();
    setDragging(type);
    setStart({ pos: getRelPos(e), area: {...currentPA} });
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e) {
      const cur = getRelPos(e);
      const dx  = cur.x - start.pos.x;
      const dy  = cur.y - start.pos.y;
      if (dragging === "move") {
        onChange({...start.area,
          cx: Math.max(0.01, Math.min(0.99, start.area.cx + dx)),
          cy: Math.max(0.01, Math.min(0.99, start.area.cy + dy)),
        });
      } else if (dragging === "resize") {
        const newW = Math.max(0.02, Math.min(0.95, start.area.w + dx * 2));
        onChange({...start.area, w: newW});
      }
    }
    function onUp() { setDragging(null); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, {passive:false});
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
  }, [dragging, start, onChange]);

  const { cx, cy } = currentPA;
  const boxWPct = curW * 100;
  const boxHPct = curH * 100;
  const boxXPct = cx * 100 - boxWPct / 2;
  const boxYPct = cy * 100 - boxHPct / 2;

  const visibleLayers = (designLayers||[]).filter(l => {
    const s = l.side || 'front';
    return side === 'front' ? (s === 'front' || s === 'both') : (s === 'back' || s === 'both');
  });

  return (
    <div>
      {/* Tab Mặt trước / Mặt sau */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        {[["front","Mặt trước"],["back","Mặt sau"]].map(([v,label]) => {
          const isBack   = v === "back";
          const active   = side === v;
          const disabled = isBack && !hasBack;
          return (
            <button key={v} onClick={()=>!disabled&&setSide(v)}
              title={disabled?"Thêm ảnh mặt sau cho màu áo trước":""}
              style={{padding:"7px 18px",border:"2px solid",
                borderColor:active?"var(--ink)":"var(--line)",borderRadius:6,
                fontWeight:700,fontSize:13,
                background:active?"var(--ink)":"#fff",
                color:active?"#fff":disabled?"#ccc":"var(--ink)",
                cursor:disabled?"not-allowed":"pointer",
                display:"flex",alignItems:"center",gap:6}}>
              {label}
              {isBack&&!hasBack&&<span style={{fontSize:10,fontWeight:400,color:"#aaa"}}>(chưa có ảnh sau)</span>}
              {isBack&&printAreaBack&&!active&&<span style={{width:8,height:8,borderRadius:"50%",background:"var(--orange)",display:"inline-block"}}/>}
            </button>
          );
        })}
        {side==="back"&&printAreaBack&&(
          <button onClick={()=>onChangeBack(null)}
            style={{marginLeft:"auto",fontSize:12,color:"#a8453a",background:"none",border:"none",cursor:"pointer"}}>
            Xóa in mặt sau
          </button>
        )}
      </div>

      {/* Khung ảnh */}
      <div ref={containerRef} style={{
        position:"relative",width:"100%",paddingBottom:"100%",
        background:"#e8e5de",borderRadius:8,overflow:"hidden",
        border:"2px solid var(--ink)",
        cursor:dragging==="move"?"grabbing":"default",
        userSelect:"none",touchAction:"none",
      }}>
        <div style={{position:"absolute",inset:0}}>
          {/* Ảnh áo */}
          {photoUrl
            ? <img src={photoUrl} alt="shirt" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none"}}/>
            : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#aaa",fontSize:12}}>
                {side==="back"?"Chưa có ảnh mặt sau":"Chưa có ảnh áo"}
              </div>
          }
          {/* Thước */}
          <img src={rulerUrl} alt="ruler" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none",opacity:RULER_OPACITY}}/>

          {/* Hộp in */}
          {(side==="front"||printAreaBack)&&(
            <div onMouseDown={e=>onMouseDown(e,"move")} onTouchStart={e=>onMouseDown(e,"move")}
              style={{position:"absolute",
                left:boxXPct+"%",top:boxYPct+"%",
                width:boxWPct+"%",height:boxHPct+"%",
                border:"2.5px solid var(--orange)",
                boxShadow:"0 0 0 1px rgba(0,0,0,.25)",
                cursor:"grab",overflow:"hidden"}}>
              {visibleLayers.map((l,i)=>l.png&&(
                <img key={i} src={l.png} alt="" style={{position:"absolute",inset:0,
                  width:"100%",height:"100%",objectFit:"contain",
                  filter:"invert(1) brightness(10)",opacity:0.75,pointerEvents:"none"}}/>
              ))}
              <div onMouseDown={e=>onMouseDown(e,"resize")} onTouchStart={e=>onMouseDown(e,"resize")}
                style={{position:"absolute",right:-7,bottom:-7,width:14,height:14,
                  borderRadius:3,background:"var(--orange)",border:"2px solid #fff",
                  cursor:"nwse-resize",zIndex:10}}/>
            </div>
          )}

          {side==="back"&&!printAreaBack&&hasBack&&(
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <button onClick={()=>onChangeBack({cx:printArea.cx,cy:printArea.cy,w:printArea.w})}
                style={{background:"var(--orange)",color:"#fff",border:"none",
                  borderRadius:6,padding:"10px 20px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                + Thêm vị trí in mặt sau
              </button>
            </div>
          )}
        </div>
      </div>

      {/* W và H — liên kết theo tỉ lệ PNG */}
      {(side==="front"||printAreaBack)&&(
        <div style={{display:"flex",gap:12,marginTop:12}}>
          <div className="xi-field" style={{flex:1}}>
            <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:".04em",fontWeight:700}}>Rộng (cm)</label>
            <input type="number" step="0.5" min="0.5" max="60" value={wInput}
              onChange={e=>setWInput(e.target.value)}
              onBlur={e=>applyW(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&applyW(e.target.value)}
              style={{fontFamily:"JetBrains Mono",fontSize:16,fontWeight:600,
                border:"2px solid var(--ink)",borderRadius:3,padding:"8px 10px",width:"100%"}}/>
          </div>
          <div className="xi-field" style={{flex:1}}>
            <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:".04em",fontWeight:700}}>
              Cao (cm) <span style={{fontWeight:400,fontSize:10,color:"#8a8576"}}>tự theo tỉ lệ</span>
            </label>
            <input type="number" step="0.5" min="0.5" max="60" value={hInput}
              onChange={e=>setHInput(e.target.value)}
              onBlur={e=>applyH(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&applyH(e.target.value)}
              style={{fontFamily:"JetBrains Mono",fontSize:16,fontWeight:600,
                border:"2px solid var(--ink)",borderRadius:3,padding:"8px 10px",width:"100%",
                background:"#f8f5ef"}}/>
          </div>
        </div>
      )}
      <div style={{fontSize:11,color:"#8a8576",marginTop:6}}>
        Kéo hộp để di chuyển · Kéo góc cam để resize · Nhập W hoặc H — cái kia tự cập nhật theo tỉ lệ ảnh
      </div>
    </div>
  );
}
