export function formatVND(n) {
  return n.toLocaleString("vi-VN") + "đ";
}

export function humanizeFilename(filename) {
  const base = filename.replace(/\.[^/.]+$/, "");
  const cleaned = base.replace(/[-_]+/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Đọc một file ảnh và lấy ra màu đại diện (mẫu điểm giữa ảnh) để gợi ý màu
// cho nút chọn — chỉ là gợi ý ban đầu, admin có thể chỉnh lại sau.
export function sampleDominantColor(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1);
        const hex = "#" + [data[0], data[1], data[2]].map((c) => c.toString(16).padStart(2, "0")).join("");
        resolve(hex);
      } catch (e) {
        resolve("#888888");
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => resolve("#888888");
    img.src = url;
  });
}
