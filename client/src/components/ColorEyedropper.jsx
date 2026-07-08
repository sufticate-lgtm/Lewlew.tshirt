/**
 * ColorEyedropper — click lên ảnh để lấy màu tại điểm đó.
 * Dùng trong admin khi thêm màu áo: admin click vào vùng vải trên ảnh mockup
 * để lấy đúng mã hex của màu áo.
 */
import { useRef } from "react";

export default function ColorEyedropper({ imageUrl, onColor, style }) {
  const canvasRef = useRef(null);

  function handleImageLoad(e) {
    const canvas = canvasRef.current;
    canvas.width  = e.target.naturalWidth;
    canvas.height = e.target.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(e.target, 0, 0);
  }

  function handleClick(e) {
    const canvas = canvasRef.current;
    const rect   = e.target.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top)  * scaleY);
    const [r,g,b] = canvas.getContext("2d").getImageData(x,y,1,1).data;
    const hex = "#" + [r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
    onColor(hex);
  }

  return (
    <div style={style}>
      <canvas ref={canvasRef} style={{display:"none"}}/>
      <div style={{marginBottom:6,fontSize:12,color:"#6b675c"}}>
        👆 Click lên vùng vải trên ảnh để lấy màu tự động
      </div>
      <img
        src={imageUrl} alt="Chọn màu"
        crossOrigin="anonymous"
        onLoad={handleImageLoad}
        onClick={handleClick}
        style={{ maxWidth:"100%", maxHeight:200, objectFit:"contain",
          cursor:"crosshair", borderRadius:6, border:"2px dashed var(--line)" }}
      />
    </div>
  );
}
