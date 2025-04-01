/**
 * ------------------------------------------------------------
 * utilities.ts
 *
 * Helper module for formatting Figma color variables into
 * SCSS, CSS, and JSON. Handles color conversion, name cleanup,
 * and output formatting.
 *
 * Functions:
 * - rgbToHex: Converts RGB(A) to hex string
 * - formatVariableName: Cleans up variable names
 * - sortColorVariables: Sorts color variables by collection prefix and numeric suffix
 * - generateScssOutput: Outputs SCSS with sorted variables
 * - generateCssOutput: Outputs CSS (optionally inside :root)
 * - generateJsonOutput: Outputs a raw JSON color map
 * - formatColorVariable: Format a single color variable (resolve RGB or reference)
 * - resolveColor: Resolve color reference (alias) recursively (or return null)
 * ------------------------------------------------------------
 */

type ColorVariable = {
  name: string;
  hexColor: Record<string, string> | "reference";
};

/* ------------------------------------------------------------------
Converts an RGB(A) color to a Hex string
------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------
Formats a variable name for output
------------------------------------------------------------------ */

export function formatVariableName(variableName: string): string {
  return variableName
    .replace(/\s+/g, "-") // Replace whitespace with a single dash
    .replace(/\//g, "-") // Replace slashes with dashes
    .toLowerCase();
}

/* ------------------------------------------------------------------
Formats a single color variable entry based on its prefix
------------------------------------------------------------------ */

function formatVariable(variable: ColorVariable, prefix: string): string {
  const cleanName = formatVariableName(variable.name);

  if (variable.hexColor === "reference") {
    return `${prefix}${cleanName}: undefined; /* "${variable.name}" is a reference variable, unable to resolve */`;
  } else {
    const hexValue = Object.values(variable.hexColor)[0];
    return `${prefix}${cleanName}: ${hexValue};`;
  }
}

/* ------------------------------------------------------------------
Sorts color variables by collection prefix and numeric suffix
------------------------------------------------------------------ */
function sortColorVariables(colorVariables: ColorVariable[]): ColorVariable[] {
  return [...colorVariables].sort((a, b) => {
    const getParts = (name: string) => {
      const clean = formatVariableName(name);
      const [prefix, num] = clean.split(/-(?=\d+$)/); // splits at last dash before number
      return { prefix, num: parseInt(num) || 0 };
    };

    const aParts = getParts(a.name);
    const bParts = getParts(b.name);

    if (aParts.prefix < bParts.prefix) return -1;
    if (aParts.prefix > bParts.prefix) return 1;
    return aParts.num - bParts.num;
  });
}

/* ------------------------------------------------------------------
JSON Output Helper
------------------------------------------------------------------ */

export function generateJsonOutput(
  colorVariables: ColorVariable[]
): Record<string, string> {
  const sortedVariables = sortColorVariables(colorVariables);
  const collectionObject: Record<string, string> = {};

  sortedVariables.forEach((variable) => {
    const cleanName = formatVariableName(variable.name);
    collectionObject[cleanName] =
      variable.hexColor === "reference"
        ? "unresolved reference"
        : Object.values(variable.hexColor)[0];
  });
  return collectionObject;
}

/* ------------------------------------------------------------------
SCSS Output Helper
------------------------------------------------------------------ */

export function generateScssOutput(colorVariables: ColorVariable[]): string {
  return sortColorVariables(colorVariables)
    .map((variable) => formatVariable(variable, "$"))
    .join("\n");
}

/* ------------------------------------------------------------------
CSS Output Helper
------------------------------------------------------------------ */

export function generateCssOutput(
  colorVariables: ColorVariable[],
  wrapRoot: boolean
): string {
  const output = sortColorVariables(colorVariables)
    .map((variable) => formatVariable(variable, "--"))
    .join("\n");
  return wrapRoot ? `:root {\n${output}\n}` : output;
}

/* ------------------------------------------------------------------
Format a single color variable (resolve RGB or reference)
------------------------------------------------------------------ */

export async function formatColorVariable(variable: Variable) {
  const hexColor: Record<string, string> = {};

  for (const key in variable.valuesByMode) {
    const value = variable.valuesByMode[key];

    if (value && typeof value === "object") {
      const resolvedHex = await resolveColor(value);

      hexColor[variable.name] = resolvedHex || "unresolved reference";
    } else {
      hexColor[variable.name] = "unresolved reference";
    }
  }

  return {
    name: variable.name,
    hexColor,
  };
}

/* ------------------------------------------------------------------
Resolve color reference (alias) recursively (or return null)
------------------------------------------------------------------ */

export async function resolveColor(
  value: VariableValue
): Promise<string | null> {
  let current = value;
  let safetyCounter = 0;

  while (current && typeof current === "object" && "type" in current) {
    if (current.type !== "VARIABLE_ALIAS" || !current.id) break;

    const referenced = await figma.variables.getVariableByIdAsync(current.id);
    if (!referenced) return null;

    const refModeId = Object.keys(referenced.valuesByMode)[0];
    current = referenced.valuesByMode[refModeId];

    // Prevent infinite loops
    if (++safetyCounter > 10) return null;
  }

  if (current && typeof current === "object" && "r" in current) {
    return rgbToHex(current as RGB | RGBA);
  }

  return null;
}
