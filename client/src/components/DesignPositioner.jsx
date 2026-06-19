/**
 * DesignPositioner — trình định vị hình in trong Admin.
 *
 * Hiển thị ảnh thước đo (ruler mockup) làm nền, cho phép admin:
 *   - Kéo-thả hình in để chọn vị trí
 *   - Kéo tay cầm góc dưới-phải để chỉnh kích thước
 *   - Hoặc nhập số cm trực tiếp
 *   - Đọc tọa độ theo thước đo cm thực tế
 *
 * printArea lưu dưới dạng {cx, cy, w} (fraction 0-1 của kích thước ảnh).
 * Calibration từ settings chuyển fraction sang cm để hiển thị.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { Move } from "lucide-react";

const PREVIEW_SIZE = 540; // px của khung preview trong UI

export default function DesignPositioner({ rulerPhotoUrl, designLayers, printArea, calibration, onChange }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // "move" | "resize"
  const [start,    setStart]    = useState(null);

  // Chuyển fraction → cm (cho display)
  const fracToCm = useCallback((frac) => {
    if (!calibration) return (frac*100).toFixed(1);
    return ((frac - calibration.originX) / calibration.fracPerCm).toFixed(1);
  }, [calibration]);

  // Chuyển fraction → cm theo Y
  const fracYToCm = useCallback((frac) => {
    if (!calibration) return (frac*100).toFixed(1);
    return ((frac - calibration.originY) / calibration.fracPerCm).toFixed(1);
  }, [calibration]);

  // Chuyển cm → fraction
  const cmToFracX = useCallback((cm) => {
    if (!calibration) return parseFloat(cm)/100;
    return calibration.originX + parseFloat(cm) * calibration.fracPerCm;
  }, [calibration]);
  const cmToFracY = useCallback((cm) => {
    if (!calibration) return parseFloat(cm)/100;
    return calibration.originY + parseFloat(cm) * calibration.fracPerCm;
  }, [calibration]);

  function getRelPos(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left)  / PREVIEW_SIZE,
      y: (clientY - rect.top)   / PREVIEW_SIZE,
    };
  }

  function onMouseDown(e, type) {
    e.preventDefault(); e.stopPropagation();
    setDragging(type);
    setStart({ pos: getRelPos(e), area: { ...printArea } });
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e) {
      const cur = getRelPos(e);
      const dx  = cur.x - start.pos.x;
      const dy  = cur.y - start.pos.y;
      if (dragging === "move") {
        onChange({ ...start.area, cx: Math.max(0.05, Math.min(0.95, start.area.cx+dx)), cy: Math.max(0.05, Math.min(0.95, start.area.cy+dy)) });
      } else if (dragging === "resize") {
        onChange({ ...start.area, w: Math.max(0.03, Math.min(0.7, start.area.w + dx*2)) });
      }
    }
    function onUp() { setDragging(null); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive:false });
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
  }, [dragging, start, printArea, onChange]);

  const { cx, cy, w } = printArea;
  // Kích thước hộp hình in trên preview (px)
  const boxW = w * PREVIEW_SIZE;
  // Chiều cao: dùng aspect ratio của layer đầu tiên nếu có, không thì vuông
  const boxH = boxW;
  const boxX = cx * PREVIEW_SIZE - boxW/2;
  const boxY = cy * PREVIEW_SIZE - boxH/2;

  // First layer PNG for thumbnail
  const thumbPng = designLayers?.[0]?.png;

  return (
    <div>
      {/* Khung preview */}
      <div ref={containerRef} style={{
        position:"relative", width:PREVIEW_SIZE, height:PREVIEW_SIZE, maxWidth:"100%",
        background:"#e8e5de", borderRadius:8, overflow:"hidden",
        border:"2px solid var(--ink)", cursor:dragging==="move"?"grabbing":"default",
        userSelect:"none", touchAction:"none",
      }}>
        {/* Ảnh thước đo / mockup */}
        {rulerPhotoUrl ? (
          <img src={rulerPhotoUrl} alt="ruler" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover", pointerEvents:"none"}}/>
        ) : (
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#999",fontSize:13}}>
            Chưa có ảnh thước — vào tab Cài đặt để tải lên
          </div>
        )}

        {/* Hộp hình in — kéo được */}
        <div onMouseDown={e=>onMouseDown(e,"move")} onTouchStart={e=>onMouseDown(e,"move")}
          style={{
            position:"absolute",
            left: boxX, top: boxY, width: boxW, height: boxH,
            border:"2px solid rgba(255,90,31,0.9)",
            boxShadow:"0 0 0 1px rgba(0,0,0,0.3)",
            cursor:"grab", display:"flex", alignItems:"center", justifyContent:"center",
          }}>
          {thumbPng && (
            <img src={thumbPng} alt="design" style={{maxWidth:"90%",maxHeight:"90%",objectFit:"contain",filter:"invert(1) brightness(10)",opacity:0.7,pointerEvents:"none"}}/>
          )}
          {!thumbPng && <Move size={20} color="rgba(255,90,31,0.8)"/>}

          {/* Tay cầm resize góc dưới-phải */}
          <div onMouseDown={e=>onMouseDown(e,"resize")} onTouchStart={e=>onMouseDown(e,"resize")}
            style={{
              position:"absolute", right:-7, bottom:-7,
              width:14, height:14, borderRadius:3,
              background:"var(--orange)", border:"2px solid #fff",
              cursor:"nwse-resize",
            }}/>
        </div>
      </div>

      {/* Inputs số cm */}
      <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap",alignItems:"flex-end"}}>
        {[
          {label:"X (cm từ tâm)", val: fracToCm(cx), set: v=>onChange({...printArea, cx:cmToFracX(v)})},
          {label:"Y (cm từ đỉnh)", val: fracYToCm(cy), set: v=>onChange({...printArea, cy:cmToFracY(v)})},
          {label:"Rộng (cm)", val: (w/printArea.wScale||w*36).toFixed(1),
           set: v=>onChange({...printArea, w: parseFloat(v)*(calibration?.fracPerCm||0.028)})},
        ].map(({label,val,set})=>(
          <div key={label} className="xi-field" style={{minWidth:120}}>
            <label>{label}</label>
            <input type="number" step="0.5" defaultValue={val}
              onBlur={e=>set(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&set(e.target.value)}
              style={{fontFamily:"JetBrains Mono",width:"100%"}}/>
          </div>
        ))}
        <div style={{fontSize:12,color:"#6b675c",alignSelf:"flex-end",paddingBottom:8}}>
          Kéo hộp để di chuyển · Kéo góc cam để phóng to/thu nhỏ
        </div>
      </div>
    </div>
  );
}
