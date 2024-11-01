// Helper Function - retrieves and filters color variables by ID
export async function getColorVariablesByIds(
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

// Helper function to filter collections containing color variables
export async function filterCollectionsWithColors(
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

// Fetches and sends color collections to the UI
export async function populateDropdown() {
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
