import { useEffect, useRef, useState } from "react";

/**
 * Render sắc nét trên màn hình thường + Retina:
 *  - Canvas nội bộ: size × devicePixelRatio (thường = 2x → 1600px)
 *  - CSS hiển thị: 100% chiều rộng container → sắc nét ở mọi kích thước
 */
export default function ShirtCanvas({ shirtPhotoUrl, layers, printArea }) {
  const canvasRef   = useRef(null);
  const containerRef = useRef(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !shirtPhotoUrl) return;

    const dpr      = window.devicePixelRatio || 1;
    const cw       = container.clientWidth  || 800;
    const ch       = container.clientHeight || 800;
    const W        = cw  * dpr;
    const H        = ch  * dpr;

    canvas.width  = W;
    canvas.height = H;
    canvas.style.width  = cw + "px";
    canvas.style.height = ch + "px";

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    setStatus("loading");

    const shirtImg = new Image();
    shirtImg.crossOrigin = "anonymous";
    shirtImg.onload = async () => {
      ctx.clearRect(0, 0, W, H);
      // Fit shirt vào toàn bộ canvas (object-fit: contain)
      const scale = Math.min(W / shirtImg.naturalWidth, H / shirtImg.naturalHeight);
      const sw    = shirtImg.naturalWidth  * scale;
      const sh    = shirtImg.naturalHeight * scale;
      const sx    = (W - sw) / 2;
      const sy    = (H - sh) / 2;
      ctx.drawImage(shirtImg, sx, sy, sw, sh);

      if (!layers?.length || !printArea) { setStatus("done"); return; }

      const { cx, cy, w } = printArea;

      for (const layer of layers) {
        if (!layer.png || !layer.inkHex) continue;
        await new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            // Tô màu
            const off = document.createElement("canvas");
            off.width  = img.naturalWidth  || img.width;
            off.height = img.naturalHeight || img.height;
            const octx = off.getContext("2d");
            octx.drawImage(img, 0, 0);
            const id = octx.getImageData(0, 0, off.width, off.height);
            const px = id.data;
            const r  = parseInt(layer.inkHex.slice(1,3), 16);
            const g  = parseInt(layer.inkHex.slice(3,5), 16);
            const b  = parseInt(layer.inkHex.slice(5,7), 16);
            for (let i = 0; i < px.length; i += 4) {
              if (px[i+3] === 0) continue;
              const brightness = (px[i]+px[i+1]+px[i+2]) / 765;
              px[i]=r; px[i+1]=g; px[i+2]=b;
              px[i+3] = Math.round((1 - brightness) * px[i+3]);
            }
            octx.putImageData(id, 0, 0);

            // Vẽ lên áo — vị trí tương đối với vùng áo (sw×sh tại sx,sy)
            const dw = sw * w;
            const dh = (off.height / off.width) * dw;
            const dx = sx + sw * cx - dw / 2;
            const dy = sy + sh * cy - dh / 2;
            ctx.drawImage(off, dx, dy, dw, dh);
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

  return (
    <div ref={containerRef} style={{ width:"100%", height:"100%", position:"relative" }}>
      <canvas ref={canvasRef}
        style={{ display:"block", width:"100%", height:"100%",
          objectFit:"contain", imageRendering:"high-quality" }} />
      {status === "loading" && (
        <div style={{ position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center",
          background:"rgba(246,242,233,.5)", fontSize:13, color:"#8a8576" }}>
          Đang tải...
        </div>
      )}
    </div>
  );
}
