import { SHIRT_PATH, darken } from "../shirtShape";

export default function ShirtPreview({ shirtHex, designSvg, colors, size = 280 }) {
  const dark = darken(shirtHex, 0.18);
  const svgInner =
    designSvg && colors
      ? designSvg.replaceAll("__PRIMARY__", colors.primary).replaceAll("__SECONDARY__", colors.secondary)
      : "";

  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 400 460">
      <path d={SHIRT_PATH} fill={shirtHex} stroke={dark} strokeWidth="5" strokeLinejoin="round" />
      <path d="M150,38 Q200,78 250,38" fill="none" stroke={dark} strokeWidth="7" strokeLinecap="round" opacity="0.8" />
      <rect x="40" y="80" width="32" height="13" fill={dark} opacity="0.7" transform="rotate(-22 56 86)" />
      <rect x="328" y="80" width="32" height="13" fill={dark} opacity="0.7" transform="rotate(22 344 86)" />
      <line x1="112" y1="424" x2="288" y2="424" stroke={dark} strokeWidth="4" opacity="0.6" />
      {svgInner && (
        <svg x="125" y="150" width="150" height="150" viewBox="0 0 200 200" dangerouslySetInnerHTML={{ __html: svgInner }} />
      )}
    </svg>
  );
}
