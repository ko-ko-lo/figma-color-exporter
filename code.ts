figma.showUI(__html__);
figma.ui.resize(600, 560);

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

    // Map the color collections to the required format
    const filteredCollections = colorCollections.map((collection) => ({
      id: collection.id,
      name: collection.name,
    }));

    // Send only color collections to the UI
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
