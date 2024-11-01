import { rgbToHex } from "./utilities";

figma.showUI(__html__);
figma.ui.resize(600, 560);

// Helper Function - retrieves and filters color variables by ID
async function getColorVariablesByIds(
  variableIds: string[]
): Promise<Variable[]> {
  const variables = await Promise.all(
    variableIds.map((id) => figma.variables.getVariableByIdAsync(id))
  );
  return variables.filter(
    (variable): variable is Variable =>
      variable !== null && variable.resolvedType === "COLOR"
  );
}

// Formats variable name for output (replaces "/" and spaces with "-" and converts to lowercase)
function formatVariableName(variableName: string): string {
  return variableName
    .replace(/\s+/g, "-") // Replace whitespace with a single dash
    .replace(/\//g, "-") // Replace slashes with dashes
    .toLowerCase();
}

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

  // SCSS and CSS formats (unchanged)
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

// Fetches and sends color collections to the UI
async function populateDropdown() {
  try {
    const localCollections =
      await figma.variables.getLocalVariableCollectionsAsync();
    const colorCollections = await filterCollectionsWithColors(
      localCollections
    );

    // Map collections to include only the fields needed for the UI dropdown
    const formattedCollections = colorCollections.map((collection) => ({
      id: collection.id,
      name: collection.name,
    }));

    // Send formatted collections with IDs and names to the UI
    figma.ui.postMessage({
      type: "populateDropdown",
      collections: formattedCollections,
    });
  } catch (error) {
    console.error("Error in populateDropdown:", error);
  }
}

// Helper function to filter collections containing color variables
async function filterCollectionsWithColors(
  collections: VariableCollection[]
): Promise<VariableCollection[]> {
  const collectionPromises = collections.map(async (collection) => {
    const colorVariables = await getColorVariablesByIds(collection.variableIds);
    return colorVariables.length > 0 ? collection : null;
  });
  const results = await Promise.all(collectionPromises);
  return results.filter(
    (collection): collection is VariableCollection => collection !== null
  );
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
