import { getColorVariablesByIds, populateDropdown } from "./api";
import { formatVariableName, rgbToHex } from "./utilities";

figma.showUI(__html__);
figma.ui.resize(600, 560);

function generateOutput(
  colorVariables: {
    name: string;
    hexColor: Record<string, string> | "reference";
  }[],
  format: "scss" | "css" | "json",
  wrapRoot: boolean = true,
  collectionName: string = ""
): string | Record<string, any> {
  if (format === "json") {
    // JSON format: Collect all variables with either hex values or "unresolved reference" for references
    const collectionObject: Record<string, string> = {};

    colorVariables.forEach((variable) => {
      const cleanName = formatVariableName(variable.name);

      // Assign "unresolved reference" for variables marked as references
      if (variable.hexColor === "reference") {
        collectionObject[cleanName] = "unresolved reference";
      } else {
        // For non-reference variables, assign the hex color value
        Object.entries(variable.hexColor).forEach(([mode, hexValue]) => {
          collectionObject[cleanName] = hexValue;
        });
      }
    });

    // Return the collectionObject directly (removing the extra nesting layer)
    return collectionObject;
  }

  // SCSS and CSS formats
  const output: string[] = [];
  colorVariables.forEach((variable) => {
    const cleanName = formatVariableName(variable.name);

    if (variable.hexColor === "reference") {
      const placeholder = "undefined";
      const comment = `/* "${variable.name}" is a reference variable, unable to resolve */`;
      if (format === "scss") {
        output.push(`$${cleanName}: ${placeholder}; ${comment}`);
      } else if (format === "css") {
        output.push(`--${cleanName}: ${placeholder}; ${comment}`);
      }
    } else {
      Object.entries(variable.hexColor).forEach(([mode, hexValue]) => {
        if (format === "scss") {
          output.push(`$${cleanName}: ${hexValue};`);
        } else if (format === "css") {
          output.push(`--${cleanName}: ${hexValue};`);
        }
      });
    }
  });

  if (format === "css" && wrapRoot) {
    return `:root {\n${output.join("\n")}\n}`;
  }

  return output.join("\n");
}

async function logColorVariablesForCollection(
  collectionIds: string | string[],
  format: "scss" | "css" | "json"
): Promise<string> {
  const ids = Array.isArray(collectionIds) ? collectionIds : [collectionIds];
  const allCollectionsJson: Record<string, any> = {};
  const output: string[] = [];

  for (const collectionId of ids) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(
      collectionId
    );
    if (!collection) continue;

    const colorVariables = await getColorVariablesByIds(collection.variableIds);
    const formattedVariables = colorVariables.map((variable) => {
      const hexColor = Object.entries(variable.valuesByMode).reduce(
        (hexValues, [_, rgba]) => {
          const hexValue = rgbToHex(rgba as RGBA);
          hexValues[variable.name] =
            hexValue === "#NaNNaNNaN" ? `unresolved reference` : hexValue;
          return hexValues;
        },
        {} as Record<string, string>
      );
      return { name: variable.name, hexColor };
    });

    if (format === "json") {
      // Collect each collection JSON without the extra layer
      allCollectionsJson[collection.name] = generateOutput(
        formattedVariables,
        format
      );
    } else {
      const collectionOutput =
        format === "css"
          ? `/* ${collection.name} */\n:root {\n${generateOutput(
              formattedVariables,
              format,
              false
            )}\n}`
          : `/* ${collection.name} */\n${generateOutput(
              formattedVariables,
              format
            )}`;
      output.push(collectionOutput);
    }
  }

  if (format === "json") {
    return JSON.stringify(allCollectionsJson, null, 2);
  } else {
    return output.join("\n\n");
  }
}

// Handle UI messages
figma.ui.onmessage = async (msg) => {
  if (msg.type === "uiReady") {
    populateDropdown();
  } else if (msg.type === "generateOutput") {
    const format = msg.format as "scss" | "css" | "json";
    const collectionIds = msg.collectionIds as string[];

    const finalOutput = await logColorVariablesForCollection(
      collectionIds,
      format
    );

    // Send the output to ui.html for file download
    figma.ui.postMessage({
      type: "downloadFile",
      content: finalOutput,
      format,
    });
  } else if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
