// DesignPositioner — v4 — 2026-07-12
// Changelog: undo/redo, auto-save khi kéo/resize/thêm/xóa zone, duplicate design
import { useRef, useState, useEffect, useCallback } from "react";
const API_URL = import.meta.env.VITE_API_URL || "/api";

const RULER_FRONT   = "/seed-uploads/ruler-front.png";
const RULER_BACK    = "/seed-uploads/ruler-back.png";
const RULER_OPACITY = 0.55;
const ZONE_COLORS   = ["#e8590c","#1971C2","#2F9E44","#7048E8","#c2255c","#0c8599"];

function normalizeZones(design) {
  if (design.printZones?.length) return design.printZones;
  const zones = [];
  if (design.printArea) zones.push({
    id:"front-main", name:"Mặt trước", side:"front",
    cx:design.printArea.cx, cy:design.printArea.cy, w:design.printArea.w
  });
  if (design.printAreaBack) zones.push({
    id:"back-main", name:"Mặt sau", side:"back",
    cx:design.printAreaBack.cx, cy:design.printAreaBack.cy, w:design.printAreaBack.w
  });
  if (!zones.length) zones.push({id:"front-main",name:"Mặt trước",side:"front",cx:0.50,cy:0.37,w:0.15});
  return zones;
}

export default function DesignPositioner({
  shirtPhotoUrl, shirtPhotoBackUrl,
  designLayers, design,
  calibration, onChangeZones,
  password, designId,
}) {
  const containerRef = useRef(null);
  const saveTimer    = useRef(null);
  const [side,        setSide]       = useState("front");
  const [selectedId,  setSelectedId] = useState(null);
  const [dragging,    setDragging]   = useState(null);
  const [start,       setStart]      = useState(null);
  const [ratios,      setRatios]     = useState({});
  const [newName,     setNewName]    = useState("");
  const [zones,       setZones]      = useState(() => normalizeZones(design||{}));
  // Undo/Redo history
  const [history,     setHistory]    = useState([normalizeZones(design||{})]);
  const [histIdx,     setHistIdx]    = useState(0);

  const fpc      = calibration?.fracPerCm || 0.0191;
  const photoUrl = side==="back" ? (shirtPhotoBackUrl||shirtPhotoUrl) : shirtPhotoUrl;
  const rulerUrl = side==="back" ? RULER_BACK : RULER_FRONT;
  const hasBack  = !!shirtPhotoBackUrl;

  const canUndo = histIdx > 0;
  const canRedo = histIdx < history.length - 1;

  // Sync zones lên cha
  useEffect(() => { onChangeZones && onChangeZones(zones); }, [zones]);

  // Reset khi design thay doi
  useEffect(() => {
    const z = normalizeZones(design||{});
    setZones(z);
    setSelectedId(z[0]?.id || null);
    setHistory([z]);
    setHistIdx(0);
  }, [design?.id]);

  // Doc ti le PNG
  useEffect(() => {
    (designLayers||[]).forEach(l => {
      const zid = l.zoneId || (l.side==="back"?"back-main":"front-main");
      if (l.png) {
        const img = new Image();
        img.onload = () => {
          if (img.naturalWidth > 0)
            setRatios(r => ({...r, [zid]: img.naturalHeight/img.naturalWidth}));
        };
        img.src = l.png;
      }
    });
  }, [designLayers]);

  // Keyboard undo/redo
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey||e.metaKey) && e.key==="z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey||e.metaKey) && (e.key==="y" || (e.key==="z"&&e.shiftKey))) { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [histIdx, history]);

  // Auto-save debounce 600ms
  function scheduleSave(zs) {
    if (!password||!designId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(API_URL+"/admin/designs/"+encodeURIComponent(designId), {
          method:"PATCH",
          headers:{"Content-Type":"application/json","x-admin-password":password},
          body:JSON.stringify({printZones:zs})
        });
      } catch(e) {}
    }, 600);
  }

  // Push vào history + save
  function commitZones(zs) {
    setZones(zs);
    setHistory(h => {
      const trimmed = h.slice(0, histIdx+1);
      return [...trimmed, zs].slice(-30); // max 30 bước
    });
    setHistIdx(i => Math.min(i+1, 29));
    scheduleSave(zs);
  }

  function undo() {
    if (!canUndo) return;
    const newIdx = histIdx - 1;
    setHistIdx(newIdx);
    setZones(history[newIdx]);
    scheduleSave(history[newIdx]);
  }

  function redo() {
    if (!canRedo) return;
    const newIdx = histIdx + 1;
    setHistIdx(newIdx);
    setZones(history[newIdx]);
    scheduleSave(history[newIdx]);
  }

  const visibleZones = zones.filter(z => z.side === side);
  const selectedZone = zones.find(z => z.id === selectedId);
  const ratio = ratios[selectedId] || 1;
  const curW  = selectedZone?.w || 0.15;
  const curH  = curW * ratio;

  // updateZone chỉ dùng trong drag (không commit vào history mỗi frame)
  function updateZoneDrag(id, patch) {
    setZones(zs => zs.map(z => z.id===id ? {...z,...patch} : z));
  }

  function addZone() {
    const name = newName.trim() || `Vùng ${zones.length+1}`;
    const id   = "zone_" + Date.now();
    const newZ = {id, name, side, cx:0.50, cy:0.37, w:0.15};
    const next = [...zones, newZ];
    commitZones(next);
    setSelectedId(id);
    setNewName("");
  }

  function removeZone(id) {
    const next = zones.filter(z => z.id!==id);
    commitZones(next);
    setSelectedId(zones.find(z=>z.id!==id)?.id || null);
  }

  function getRelPos(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {x:(cx-rect.left)/rect.width, y:(cy-rect.top)/rect.height};
  }

  function onMouseDown(e, type, zoneId) {
    e.preventDefault(); e.stopPropagation();
    setSelectedId(zoneId);
    setDragging({type, zoneId});
    setStart({pos: getRelPos(e), zone: zones.find(z=>z.id===zoneId)});
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e) {
      const cur = getRelPos(e);
      const dx  = cur.x - start.pos.x;
      const dy  = cur.y - start.pos.y;
      if (dragging.type==="move") {
        updateZoneDrag(dragging.zoneId, {
          cx: Math.max(0.01, Math.min(0.99, start.zone.cx+dx)),
          cy: Math.max(0.01, Math.min(0.99, start.zone.cy+dy)),
        });
      } else if (dragging.type==="resize") {
        updateZoneDrag(dragging.zoneId, {
          w: Math.max(0.02, Math.min(0.95, start.zone.w+dx*2))
        });
      }
    }
    function onUp() {
      // Commit vào history khi thả tay
      setZones(zs => {
        commitZones(zs);
        return zs;
      });
      setDragging(null);
    }
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
  }, [dragging, start]);

  const [wInput, setWInput] = useState((curW/fpc).toFixed(1));
  const [hInput, setHInput] = useState((curH/fpc).toFixed(1));
  useEffect(() => {
    setWInput((curW/fpc).toFixed(1));
    setHInput((curW*ratio/fpc).toFixed(1));
  }, [selectedId, curW, ratio, fpc]);

  function applyW(val) {
    const cm = parseFloat(val);
    if (!isNaN(cm) && cm>0 && selectedZone) {
      const next = zones.map(z => z.id===selectedId ? {...z, w:cm*fpc} : z);
      commitZones(next);
      setHInput((cm*ratio).toFixed(1));
    }
  }
  function applyH(val) {
    const cm = parseFloat(val);
    if (!isNaN(cm) && cm>0 && ratio>0 && selectedZone) {
      const next = zones.map(z => z.id===selectedId ? {...z, w:(cm/ratio)*fpc} : z);
      commitZones(next);
      setWInput((cm/ratio).toFixed(1));
    }
  }

  return (
    <div>
      {/* Tab mặt + Undo/Redo */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        {[["front","Mặt trước"],["back","Mặt sau"]].map(([v,label])=>{
          const disabled = v==="back" && !hasBack;
          return (
            <button key={v} onClick={()=>!disabled&&setSide(v)}
              style={{padding:"6px 16px",border:"2px solid",
                borderColor:side===v?"var(--ink)":"var(--line)",borderRadius:6,
                fontWeight:700,fontSize:13,cursor:disabled?"not-allowed":"pointer",
                background:side===v?"var(--ink)":"#fff",
                color:side===v?"#fff":disabled?"#ccc":"var(--ink)",
                display:"flex",alignItems:"center",gap:5}}>
              {label}
              {v==="back"&&!hasBack&&<span style={{fontSize:10,fontWeight:400,color:"#aaa"}}>(chưa có ảnh)</span>}
              {v==="back"&&zones.some(z=>z.side==="back")&&<span style={{width:7,height:7,borderRadius:"50%",background:"#2F9E44",display:"inline-block"}}/>}
            </button>
          );
        })}
        {/* Undo/Redo buttons */}
        <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            style={{padding:"6px 12px",border:"2px solid var(--line)",borderRadius:6,
              background:"#fff",cursor:canUndo?"pointer":"default",
              opacity:canUndo?1:0.3,fontWeight:700,fontSize:13}}>↩ Undo</button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
            style={{padding:"6px 12px",border:"2px solid var(--line)",borderRadius:6,
              background:"#fff",cursor:canRedo?"pointer":"default",
              opacity:canRedo?1:0.3,fontWeight:700,fontSize:13}}>↪ Redo</button>
        </div>
      </div>

      {/* Danh sach vung */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
        {visibleZones.map((z,i)=>{
          const color = ZONE_COLORS[zones.indexOf(z) % ZONE_COLORS.length];
          return (
            <div key={z.id} onClick={()=>setSelectedId(z.id)}
              style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",
                borderRadius:20,border:"2px solid",borderColor:color,cursor:"pointer",
                background:selectedId===z.id?color:"#fff",
                color:selectedId===z.id?"#fff":color,fontSize:12,fontWeight:700}}>
              <span>{z.name}</span>
              {zones.length>1&&(
                <span onClick={e=>{e.stopPropagation();removeZone(z.id);}}
                  style={{marginLeft:2,opacity:.7,cursor:"pointer",fontSize:14,lineHeight:1}}>×</span>
              )}
            </div>
          );
        })}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)}
            placeholder={`Vùng ${zones.length+1}`}
            onKeyDown={e=>e.key==="Enter"&&addZone()}
            style={{width:100,fontSize:12,padding:"4px 8px",border:"1.5px dashed #bbb",borderRadius:20}}/>
          <button onClick={addZone}
            style={{padding:"4px 10px",borderRadius:20,border:"2px dashed #bbb",
              fontSize:12,cursor:"pointer",background:"#fff",fontWeight:700,color:"#666"}}>
            + Thêm vùng
          </button>
        </div>
      </div>

      {/* Khung ảnh */}
      <div ref={containerRef} style={{
        position:"relative",width:"100%",paddingBottom:"100%",
        background:"#e8e5de",borderRadius:8,overflow:"hidden",
        border:"2px solid var(--ink)",userSelect:"none",touchAction:"none",
      }}>
        <div style={{position:"absolute",inset:0}}>
          {photoUrl
            ? <img src={photoUrl} alt="shirt" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none"}}/>
            : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#aaa",fontSize:12}}>Chưa có ảnh áo</div>
          }
          <img src={rulerUrl} alt="ruler" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none",opacity:RULER_OPACITY}}/>

          {visibleZones.map((z,i) => {
            const color    = ZONE_COLORS[zones.indexOf(z) % ZONE_COLORS.length];
            const zRatio   = ratios[z.id] || 1;
            const bw       = z.w * 100;
            const bh       = z.w * zRatio * 100;
            const bx       = z.cx * 100 - bw/2;
            const by       = z.cy * 100 - bh/2;
            const isActive = selectedId === z.id;
            const layersInZone = (designLayers||[]).filter(l=>(l.zoneId||"front-main")===z.id);
            return (
              <div key={z.id}
                onMouseDown={e=>onMouseDown(e,"move",z.id)}
                onTouchStart={e=>onMouseDown(e,"move",z.id)}
                style={{position:"absolute",
                  left:bx+"%",top:by+"%",width:bw+"%",height:bh+"%",
                  border:`2.5px solid ${color}`,
                  boxShadow:isActive?`0 0 0 2px rgba(0,0,0,.3)`:undefined,
                  cursor:"grab",overflow:"hidden",
                  opacity:isActive?1:0.6,
                  zIndex:isActive?2:1}}>
                <div style={{position:"absolute",top:0,left:0,
                  background:color,color:"#fff",fontSize:9,fontWeight:700,
                  padding:"1px 4px",borderRadius:"0 0 4px 0",zIndex:3,whiteSpace:"nowrap"}}>
                  {z.name}
                </div>
                {layersInZone.map((l,li)=>l.png&&(
                  <img key={li} src={l.png} alt="" style={{position:"absolute",inset:0,
                    width:"100%",height:"100%",objectFit:"contain",
                    filter:"invert(1) brightness(10)",opacity:0.7,pointerEvents:"none"}}/>
                ))}
                {isActive&&(
                  <div onMouseDown={e=>onMouseDown(e,"resize",z.id)}
                    onTouchStart={e=>onMouseDown(e,"resize",z.id)}
                    style={{position:"absolute",right:-7,bottom:-7,width:14,height:14,
                      borderRadius:3,background:color,border:"2px solid #fff",
                      cursor:"nwse-resize",zIndex:10}}/>
                )}
              </div>
            );
          })}

          {visibleZones.length===0&&(
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <button onClick={addZone}
                style={{background:"var(--orange)",color:"#fff",border:"none",
                  borderRadius:6,padding:"10px 20px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                + Thêm vùng in {side==="back"?"mặt sau":"mặt trước"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* W/H */}
      {selectedZone&&selectedZone.side===side&&(
        <>
          <div style={{marginTop:8,fontSize:12,color:"#555",fontWeight:600}}>
            Đang chỉnh: <span style={{color:ZONE_COLORS[zones.findIndex(z=>z.id===selectedId)%ZONE_COLORS.length]}}>{selectedZone.name}</span>
          </div>
          <div style={{display:"flex",gap:12,marginTop:8}}>
            <div className="xi-field" style={{flex:1}}>
              <label style={{fontSize:11,textTransform:"uppercase",fontWeight:700}}>Rộng (cm)</label>
              <input type="number" step="0.5" min="0.5" max="60" value={wInput}
                onChange={e=>setWInput(e.target.value)}
                onBlur={e=>applyW(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&applyW(e.target.value)}
                style={{fontFamily:"JetBrains Mono",fontSize:16,fontWeight:600,
                  border:"2px solid var(--ink)",borderRadius:3,padding:"8px 10px",width:"100%"}}/>
            </div>
            <div className="xi-field" style={{flex:1}}>
              <label style={{fontSize:11,textTransform:"uppercase",fontWeight:700}}>
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
        </>
      )}
      <div style={{fontSize:11,color:"#8a8576",marginTop:6}}>
        Click vùng để chọn · Kéo để di chuyển · Kéo góc để resize · Ctrl+Z undo · Ctrl+Y redo
      </div>
    </div>
  );
}
