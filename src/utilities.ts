type ColorVariable = {
  name: string;
  hexColor: Record<string, string> | "reference";
};

// Converts an RGB(A) color to a Hex string
export function rgbToHex(color: RGB | RGBA): string {
  const toHex = (value: number): string => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  const { r, g, b } = color;
  const hex = [toHex(r), toHex(g), toHex(b)].join("");
  return "a" in color && typeof color.a === "number" && color.a < 1
    ? `#${hex}${toHex(color.a)}`
    : `#${hex}`;
}

// Formats a variable name for output
export function formatVariableName(variableName: string): string {
  return variableName
    .replace(/\s+/g, "-") // Replace whitespace with a single dash
    .replace(/\//g, "-") // Replace slashes with dashes
    .toLowerCase();
}

// Formats a single color variable entry based on its prefix
function formatVariable(variable: ColorVariable, prefix: string): string {
  const cleanName = formatVariableName(variable.name);

  if (variable.hexColor === "reference") {
    return `${prefix}${cleanName}: undefined; /* "${variable.name}" is a reference variable, unable to resolve */`;
  } else {
    const hexValue = Object.values(variable.hexColor)[0];
    return `${prefix}${cleanName}: ${hexValue};`;
  }
}

// JSON Output Helper
export function generateJsonOutput(
  colorVariables: ColorVariable[]
): Record<string, string> {
  const collectionObject: Record<string, string> = {};

  colorVariables.forEach((variable) => {
    const cleanName = formatVariableName(variable.name);
    collectionObject[cleanName] =
      variable.hexColor === "reference"
        ? "unresolved reference"
        : Object.values(variable.hexColor)[0];
  });
  return collectionObject;
}

// SCSS Output Helper
export function generateScssOutput(colorVariables: ColorVariable[]): string {
  return colorVariables
    .map((variable) => formatVariable(variable, "$"))
    .join("\n");
}

// CSS Output Helper
export function generateCssOutput(
  colorVariables: ColorVariable[],
  wrapRoot: boolean
): string {
  const output = colorVariables
    .map((variable) => formatVariable(variable, "--"))
    .join("\n");
  return wrapRoot ? `:root {\n${output}\n}` : output;
}
