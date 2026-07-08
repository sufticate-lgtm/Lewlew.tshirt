// Dùng kỹ thuật CSS mask: lấy hình dạng (kênh alpha) từ file PNG của hình in,
// rồi tô đầy bằng màu mực khách chọn. File hình in nên là PNG nền trong suốt
// (màu của nét vẽ không quan trọng, chỉ cần đủ độ đậm để không bị mờ ở viền).
export default function ProductPreview({ shirtPhoto, designArt, printColorHex, size = 280, placement }) {
  const pos = placement || { top: "30%", left: "36%", width: "28%", height: "28%" };

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {shirtPhoto ? (
        <img src={shirtPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", border: "2px dashed var(--line)", borderRadius: 6 }} />
      )}
      {designArt && printColorHex && (
        <div
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            height: pos.height,
            backgroundColor: printColorHex,
            WebkitMaskImage: `url(${designArt})`,
            maskImage: `url(${designArt})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      )}
    </div>
  );
}
