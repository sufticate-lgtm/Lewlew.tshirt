export const SHIRT_PATH =
  "M160,30 L120,55 L40,90 L70,180 L120,150 L110,430 L290,430 L280,150 L330,180 L360,90 L280,55 L240,30 Q200,70 160,30 Z";

export function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.round(c * (1 - amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function formatVND(n) {
  return n.toLocaleString("vi-VN") + "đ";
}
