// Helper Function - convert RGB(A) color to Hex string
export function rgbToHex(color: RGB | RGBA): string {
  const toHex = (value: number): string => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  const { r, g, b } = color;
  const hex = [toHex(r), toHex(g), toHex(b)].join("");
  return "a" in color && color.a < 1 ? `#${hex}${toHex(color.a)}` : `#${hex}`;
}

// Formats variable name for output (replaces "/" and spaces with "-" and converts to lowercase)
export function formatVariableName(variableName: string): string {
  return variableName
    .replace(/\s+/g, "-") // Replace whitespace with a single dash
    .replace(/\//g, "-") // Replace slashes with dashes
    .toLowerCase();
}
