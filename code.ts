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

// Reusable function to format color variable elements in hex
function createColorElements(variable: Variable): string[] {
  const valuesByMode = variable.valuesByMode;
  const cleanVariableName = variable.name.split("/").pop();
  return Object.entries(valuesByMode).map(([mode, colorValue]) => {
    const hexString = rgbToHex(colorValue as RGBA);
    return `Mode: ${mode}, $${cleanVariableName}: ${hexString}`;
  });
}

// Fetches and logs hex color values for all color variables in collections
async function getColorVariablesFromCollections(
  collections: VariableCollection[]
) {
  const colorCollectionsData = await Promise.all(
    collections.map(async (collection) => {
      const colorVariables = await getColorVariablesByIds(
        collection.variableIds
      );

      console.log(`Collection: ${collection.name} (ID: ${collection.id})`);
      colorVariables.forEach((variable) => {
        const colorElements = createColorElements(variable);
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

// Logs color variables for a single collection by ID
async function logColorVariablesForCollection(collectionId: string) {
  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(
      collectionId
    );
    if (!collection) {
      console.warn(`Collection with ID ${collectionId} not found.`);
      return;
    }
    const colorVariables = await getColorVariablesByIds(collection.variableIds);

    console.log(
      `Checked Collection: ${collection.name} (ID: ${collection.id})`
    );
    colorVariables.forEach((variable) => {
      const colorElements = createColorElements(variable);
      colorElements.forEach((scssVariable) => console.log(scssVariable));
    });
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

    const filteredCollections = await getColorVariablesFromCollections(
      colorCollections
    );
    figma.ui.postMessage({
      type: "populateDropdown",
      collections: filteredCollections,
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
  } else if (msg.type === "collectionChecked") {
    const { collectionId, isChecked } = msg;
    if (isChecked) {
      await logColorVariablesForCollection(collectionId);
    } else {
      console.log(`Collection with ID ${collectionId} was unchecked.`);
    }
  } else if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
