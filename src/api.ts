// Retrieves and filters color variables by ID
export async function getColorVariablesByIds(
  variableIds: string[]
): Promise<Variable[]> {
  const variables = await Promise.all(
    variableIds.map(async (id) => {
      try {
        return await figma.variables.getVariableByIdAsync(id);
      } catch (error) {
        console.error(`Error retrieving variable with ID ${id}:`, error);
        return null;
      }
    })
  );
  // Filter out null values and non-color variables
  return variables.filter(
    (variable): variable is Variable =>
      variable !== null && variable.resolvedType === "COLOR"
  );
}

// Filters collections to only those that contain color variables
export async function filterCollectionsWithColors(
  collections: VariableCollection[]
): Promise<VariableCollection[]> {
  const filteredCollections = await Promise.all(
    collections.map(async (collection) => {
      const colorVariables = await getColorVariablesByIds(
        collection.variableIds
      );
      return colorVariables.length > 0 ? collection : null;
    })
  );
  // Return only collections that have color variables
  return filteredCollections.filter(
    (collection): collection is VariableCollection => collection !== null
  );
}

// Populates dropdown with collections containing color variables and sends to UI
export async function populateDropdown(): Promise<void> {
  try {
    const localCollections =
      await figma.variables.getLocalVariableCollectionsAsync();
    const colorCollections = await filterCollectionsWithColors(
      localCollections
    );

    // Structure dropdown items
    const formattedCollections: { id: string; name: string }[] =
      colorCollections.map((collection) => ({
        id: collection.id,
        name: collection.name,
      }));

    // Send formatted collections to the UI
    figma.ui.postMessage({
      type: "populateDropdown",
      collections: formattedCollections,
    });
  } catch (error) {
    console.error("Error in populateDropdown:", error);
  }
}
