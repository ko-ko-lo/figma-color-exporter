import { getColorVariablesByIds, populateDropdown } from "./api";
import {
  generateCssOutput,
  generateJsonOutput,
  generateScssOutput,
  rgbToHex,
} from "./utilities";

figma.showUI(__html__);
figma.ui.resize(600, 560);

// Helper function to format a color variable
function formatColorVariable(variable: Variable) {
  const hexColor = Object.entries(variable.valuesByMode).reduce(
    (hexValues, [_, rgba]) => {
      const hexValue = rgbToHex(rgba as RGBA);
      hexValues[variable.name] =
        hexValue === "#NaNNaNNaN" ? "unresolved reference" : hexValue;
      return hexValues;
    },
    {} as Record<string, string>
  );
  return { name: variable.name, hexColor };
}

async function exportColorVariables(
  collectionIds: string | string[],
  format: "scss" | "css" | "json"
): Promise<string> {
  const ids = Array.isArray(collectionIds) ? collectionIds : [collectionIds];
  const allCollectionsJson: Record<string, Record<string, string>> = {};
  const cssOutput: string[] = [];

  for (const collectionId of ids) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(
      collectionId
    );
    if (!collection) continue;

    const colorVariables = await getColorVariablesByIds(collection.variableIds);
    const formattedVariables = colorVariables.map(formatColorVariable);

    if (format === "json") {
      allCollectionsJson[collection.name] =
        generateJsonOutput(formattedVariables);
    } else {
      cssOutput.push(
        `/* ${collection.name} */\n${
          format === "css"
            ? `:root {\n${generateCssOutput(formattedVariables, false)}\n}`
            : generateScssOutput(formattedVariables)
        }`
      );
    }
  }

  return format === "json"
    ? JSON.stringify(allCollectionsJson, null, 2)
    : cssOutput.join("\n\n");
}

// Handle UI messages
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === "uiReady") {
      populateDropdown();
    } else if (msg.type === "generateOutput") {
      const format = msg.format as "scss" | "css" | "json";
      const collectionIds = msg.collectionIds as string[];

      const finalOutput = await exportColorVariables(collectionIds, format);

      figma.ui.postMessage({
        type: "downloadFile",
        content: finalOutput,
        format,
      });
    } else if (msg.type === "cancel") {
      figma.closePlugin();
    }
  } catch (error) {
    console.error("Error handling UI message:", error);
  }
};
