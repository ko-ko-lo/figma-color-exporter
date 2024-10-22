// Helper Function - convert RGB(A) color to Hex string
export function rgbToHex(color: RGB | RGBA): string {
  const toHex = (value: number): string => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  const { r, g, b } = color;
  const hex = [toHex(r), toHex(g), toHex(b)].join("");

  if ("a" in color && color.a < 1) {
    const a = toHex(color.a);
    return `#${hex}${a}`;
  } else {
    return `#${hex}`;
  }
}
