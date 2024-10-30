figma.showUI(__html__);
figma.ui.resize(600, 560);

// Helper Function - convert RGB(A) color to Hex string
function rgbToHex(color: RGB | RGBA): string {
  const toHex = (value: number): string => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  const { r, g, b } = color;
  const hex = [toHex(r), toHex(g), toHex(b)].join("");
  return "a" in color && color.a < 1 ? `#${hex}${toHex(color.a)}` : `#${hex}`;
}

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

// Formats variable name for output (replaces "/" with "-" and converts to lowercase)
function formatVariableName(variableName: string): string {
  return variableName.replace(/\//g, "-").toLowerCase();
}

// Generates output in SCSS, CSS, or JSON format
function generateOutput(
  colorVariables: { name: string; hexColor: Record<string, string> }[],
  format: "scss" | "css" | "json"
): string {
  const output: string[] = [];

  colorVariables.forEach((variable) => {
    const cleanName = formatVariableName(variable.name);

    Object.entries(variable.hexColor).forEach(([mode, hexValue]) => {
      const variableName = `${cleanName}`;
      switch (format) {
        case "scss":
          output.push(`$${variableName}: ${hexValue};`);
          break;
        case "css":
          output.push(`--${variableName}: ${hexValue};`);
          break;
        case "json":
          output.push(`"${variableName}": "${hexValue}"`);
          break;
      }
    });
  });

  if (format === "css") {
    return `:root {\n${output.join("\n")}\n}`;
  } else if (format === "json") {
    return `{\n${output.join(",\n")}\n}`;
  }

  return output.join("\n");
}

// Logs color variables for a single collection by ID in different formats
async function logColorVariablesForCollection(
  collectionId: string,
  format: "scss" | "css" | "json"
) {
  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(
      collectionId
    );
    if (!collection) {
      console.warn(`Collection with ID ${collectionId} not found.`);
      return;
    }

    const colorVariables = await getColorVariablesByIds(collection.variableIds);

    const formattedVariables = colorVariables.map((variable) => {
      // Convert direct color values to hex
      const hexColor = Object.entries(variable.valuesByMode).reduce(
        (hexValues, [mode, rgba]) => {
          const hexValue = rgbToHex(rgba as RGBA);
          // Check if the output is NaN; if so, assume it's a reference
          hexValues[mode] =
            hexValue === "#NaNNaNNaN"
              ? `/* ${variable.name} is a reference variable, unable to resolve */`
              : hexValue;
          return hexValues;
        },
        {} as Record<string, string>
      );

      return {
        name: variable.name,
        hexColor,
      };
    });

    // Generate output based on the type of each variable
    const output = formattedVariables
      .map((variable) => generateOutput([variable], format))
      .join("\n");

    console.log(`${format.toUpperCase()} Output:\n`, output);
  } catch (error) {
    console.error("Error retrieving color variables for collection:", error);
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

    // Loop through each selected collection ID and log the output
    for (const collectionId of collectionIds) {
      await logColorVariablesForCollection(collectionId, format);
    }
  } else if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
