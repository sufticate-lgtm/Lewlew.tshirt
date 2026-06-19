import { useEffect, useRef, useState } from "react";

/**
 * Vẽ ảnh mockup áo + PNG hình in đã tô màu lên một canvas duy nhất.
 *
 * Thuật toán tô màu:
 *   - Mỗi pixel của file PNG đen:
 *       alpha_mới = alpha_gốc × (1 – brightness)   → pixel tối giữ nguyên, pixel sáng/trắng → trong suốt
 *       rgb = màu mực khách chọn
 *   - Kết quả: vùng đen = màu mực đậm, vùng xám = màu mực nhạt, vùng trắng/trong = biến mất
 */
export default function ShirtCanvas({ shirtPhotoUrl, designPngUrl, inkHex, size = 360 }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error

  useEffect(() => {
    if (!shirtPhotoUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    setStatus("loading");

    const shirtImg = new Image();
    shirtImg.crossOrigin = "anonymous";

    shirtImg.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(shirtImg, 0, 0, canvas.width, canvas.height);

      if (!designPngUrl || !inkHex) { setStatus("done"); return; }

      const designImg = new Image();
      designImg.crossOrigin = "anonymous";

      designImg.onload = () => {
        // -- tô màu PNG --
        const offscreen = document.createElement("canvas");
        offscreen.width  = designImg.naturalWidth  || designImg.width;
        offscreen.height = designImg.naturalHeight || designImg.height;
        const octx = offscreen.getContext("2d");
        octx.drawImage(designImg, 0, 0);

        const imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
        const px = imgData.data;
        const r = parseInt(inkHex.slice(1,3), 16);
        const g = parseInt(inkHex.slice(3,5), 16);
        const b = parseInt(inkHex.slice(5,7), 16);

        for (let i = 0; i < px.length; i += 4) {
          if (px[i+3] === 0) continue;                          // đã trong suốt → bỏ qua
          const brightness = (px[i] + px[i+1] + px[i+2]) / 765; // 0=đen, 1=trắng
          const darkness   = 1 - brightness;
          px[i]   = r;
          px[i+1] = g;
          px[i+2] = b;
          px[i+3] = Math.round(darkness * px[i+3]);            // pixel trắng → trong suốt
        }
        octx.putImageData(imgData, 0, 0);

        // -- vẽ lên áo (căn giữa vùng ngực, ~38% từ trên, 33% chiều rộng canvas) --
        const dw = canvas.width  * 0.33;
        const dh = (offscreen.height / offscreen.width) * dw;
        const dx = (canvas.width  - dw) / 2;
        const dy = canvas.height * 0.37 - dh / 2;
        ctx.drawImage(offscreen, dx, dy, dw, dh);
        setStatus("done");
      };
      designImg.onerror = () => { setStatus("error"); };
      designImg.src = designPngUrl + "?t=" + Date.now(); // tránh cache cũ
    };
    shirtImg.onerror = () => setStatus("error");
    shirtImg.src = shirtPhotoUrl + "?t=" + Date.now();
  }, [shirtPhotoUrl, designPngUrl, inkHex, size]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <canvas ref={canvasRef} width={size} height={size}
        style={{ display: "block", maxWidth: "100%", borderRadius: 6 }} />
      {status === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", background: "rgba(246,242,233,.7)", borderRadius: 6 }}>
          <span style={{ fontSize: 13, color: "#8a8576" }}>Đang tải...</span>
        </div>
      )}
    </div>
  );
}
