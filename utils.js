import { useEffect, useRef, useState } from "react";

/**
 * Render nhiều layer PNG đen (mỗi layer một màu mực riêng) lên ảnh mockup áo.
 *
 * Thuật toán tô màu per-layer:
 *   alpha_mới = alpha_gốc × (1 – brightness)
 *   rgb       = màu mực của layer đó
 *
 * Vị trí hình in dựa trên printArea.cx/cy/w (fraction của chiều rộng ảnh).
 */
export default function ShirtCanvas({ shirtPhotoUrl, layers, printArea, zoom = 1, size = 380 }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !shirtPhotoUrl) return;
    const ctx = canvas.getContext("2d");
    setStatus("loading");

    const shirtImg = new Image();
    shirtImg.crossOrigin = "anonymous";
    shirtImg.onload = async () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(shirtImg, 0, 0, canvas.width, canvas.height);

      if (!layers?.length || !printArea) { setStatus("done"); return; }

      const { cx, cy, w } = printArea;

      for (const layer of layers) {
        if (!layer.png || !layer.inkHex) continue;
        await new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const offscreen = document.createElement("canvas");
            offscreen.width  = img.naturalWidth  || img.width;
            offscreen.height = img.naturalHeight || img.height;
            const octx = offscreen.getContext("2d");
            octx.drawImage(img, 0, 0);

            const imageData = octx.getImageData(0,0,offscreen.width,offscreen.height);
            const px = imageData.data;
            const r = parseInt(layer.inkHex.slice(1,3),16);
            const g = parseInt(layer.inkHex.slice(3,5),16);
            const b = parseInt(layer.inkHex.slice(5,7),16);
            for (let i=0; i<px.length; i+=4) {
              if (px[i+3]===0) continue;
              const brightness = (px[i]+px[i+1]+px[i+2])/765;
              px[i]=r; px[i+1]=g; px[i+2]=b;
              px[i+3] = Math.round((1-brightness)*px[i+3]);
            }
            octx.putImageData(imageData,0,0);

            const dw = canvas.width * w;
            const dh = (offscreen.height/offscreen.width)*dw;
            const dx = canvas.width*cx - dw/2;
            const dy = canvas.height*cy - dh/2;
            ctx.drawImage(offscreen, dx, dy, dw, dh);
            resolve();
          };
          img.onerror = resolve;
          img.src = layer.png + "?v=" + layer.inkHex;
        });
      }
      setStatus("done");
    };
    shirtImg.onerror = () => setStatus("error");
    shirtImg.src = shirtPhotoUrl + "?t=" + Date.now();
  }, [shirtPhotoUrl, layers, printArea]);

  const displaySize = size * zoom;
  return (
    <div style={{ position:"relative", display:"inline-block",
      width: displaySize, height: displaySize, overflow:"hidden", borderRadius:8 }}>
      <canvas ref={canvasRef} width={size} height={size}
        style={{ display:"block", width:displaySize, height:displaySize,
          imageRendering:"high-quality" }} />
      {status==="loading" && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
          justifyContent:"center", background:"rgba(246,242,233,.6)", borderRadius:8 }}>
          <span style={{fontSize:13,color:"#8a8576"}}>Đang tải...</span>
        </div>
      )}
    </div>
  );
}
