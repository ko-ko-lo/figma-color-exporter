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

  if ("a" in color && color.a < 1) {
    const a = toHex(color.a);
    return `#${hex}${a}`;
  } else {
    return `#${hex}`;
  }
}

// Helper Function - collects variables of any type
async function getVariablesByIds(
  variableIds: string[]
): Promise<(Variable | null)[]> {
  return Promise.all(
    variableIds.map((id) => figma.variables.getVariableByIdAsync(id))
  );
}

// Helper function to filter collections containing color variables
async function filterCollectionsWithColors(
  collections: VariableCollection[]
): Promise<VariableCollection[]> {
  const collectionPromises = collections.map(async (collection) => {
    const variables = await getVariablesByIds(collection.variableIds);
    return variables.some(
      (variable) => variable && variable.resolvedType === "COLOR"
    )
      ? collection
      : null;
  });

  const results = await Promise.all(collectionPromises);
  return results.filter(
    (collection): collection is VariableCollection => collection !== null
  );
}

// Function to fetch color variables from each color collection
async function getColorVariablesFromCollections(
  collections: VariableCollection[]
) {
  const colorCollectionsData = await Promise.all(
    collections.map(async (collection) => {
      const variables = await getVariablesByIds(collection.variableIds);

      // Filter only color variables
      const colorVariables = variables.filter(
        (variable): variable is Variable =>
          variable !== null && variable.resolvedType === "COLOR"
      );

      // Log color variables in hex for each collection
      console.log(`Collection: ${collection.name} (ID: ${collection.id})`);
      colorVariables.forEach((variable) => {
        const colorElements = createColorElements(variable, rgbToHex);
        colorElements.forEach((scssVariable) => console.log(scssVariable));
      });

      return {
        id: collection.id,
        name: collection.name,
        colorVariables,
      };
    })
  );

  return colorCollectionsData;
}

// Reuse createColorElements for hex conversion and logging
function createColorElements(
  variable: Variable,
  rgbToHex: (color: RGB | RGBA) => string
): string[] {
  const valuesByMode = variable.valuesByMode;
  const cleanVariableName = variable.name.split("/").pop();
  const hexValues: string[] = [];

  for (const modeId in valuesByMode) {
    if (Object.prototype.hasOwnProperty.call(valuesByMode, modeId)) {
      const colorValue = valuesByMode[modeId] as RGB | RGBA;
      const hexString = rgbToHex(colorValue);
      // Create log entry for each mode in hex
      hexValues.push(`Mode: ${modeId}, $${cleanVariableName}: ${hexString}`);
    }
  }
  return hexValues;
}
// Function to send only color collections to the UI
async function populateDropdown() {
  try {
    // Get all local collections
    const localCollections =
      await figma.variables.getLocalVariableCollectionsAsync();

    // Filter to get only collections containing color variables
    const colorCollections = await filterCollectionsWithColors(
      localCollections
    );

    // Get and log color variables for each color collection
    const filteredCollections = await getColorVariablesFromCollections(
      colorCollections
    );

    // Send color collections with their color variables to the UI
    figma.ui.postMessage({
      type: "populateDropdown",
      collections: filteredCollections,
    });
  } catch (error) {
    console.error("Error in populateDropdown:", error);
  }
}

// Listen for messages from the UI
figma.ui.onmessage = (msg) => {
  if (msg.type === "uiReady") {
    populateDropdown();
  }

  // Close the plugin when cancel is clicked
  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
