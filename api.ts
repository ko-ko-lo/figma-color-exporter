import { rgbToHex } from "./utilities";

// Constants for message types
const MessageTypes = {
  POPULATE_DROPDOWN: "populateDropdown",
  EXPORT_XML: "export-xml",
};

// Store the current collections of variables
let currentCollections: { id: string; name: string }[] = [];

// Helper Function - collects variables of any type
async function getVariablesByIds(
  variableIds: string[]
): Promise<(Variable | null)[]> {
  return Promise.all(
    variableIds.map((id) => figma.variables.getVariableByIdAsync(id))
  );
}

// Helper Function - filters for Color Variables
async function getColorVariables(variableIds: string[]): Promise<Variable[]> {
  const variables = await getVariablesByIds(variableIds);
  return variables.filter(
    (variable): variable is Variable =>
      variable !== null && variable.resolvedType === "COLOR"
  );
}

// Helper Function - converts into a simple list of collections with their ids and names
function mapCollections(
  collections: VariableCollection[]
): { id: string; name: string }[] {
  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
  }));
}

// Core Function - gets a list of color collections and sends list to UI
export async function populateDropdown(): Promise<void> {
  try {
    const localCollections =
      await figma.variables.getLocalVariableCollectionsAsync();
    const filteredCollections = await filterCollectionsWithColors(
      localCollections
    );

    figma.ui.postMessage({
      type: MessageTypes.POPULATE_DROPDOWN,
      collections: filteredCollections.map((collection) => ({
        id: collection.id,
        name: collection.name,
      })),
    });
  } catch (error) {
    console.error("Error populating dropdown:", error);
  }
}

// Core Function - filter collections to include only those with color variables
async function filterCollectionsWithColors(
  collections: VariableCollection[]
): Promise<VariableCollection[]> {
  const collectionPromises = collections.map(async (collection) => {
    const variables = await getVariablesByIds(collection.variableIds);
    return variables.some((variable) => variable?.resolvedType === "COLOR")
      ? collection
      : null;
  });

  const results = await Promise.all(collectionPromises);
  return results.filter(
    (collection): collection is VariableCollection => collection !== null
  );
}

// Export the selected color collections as XML
export async function exportColorCollections(
  collectionNames: string[]
): Promise<void> {
  try {
    const localCollections =
      await figma.variables.getLocalVariableCollectionsAsync();
    let xmlContent = "";

    // Process collections concurrently
    const collectionPromises = collectionNames.map(async (collectionName) => {
      const colorsCollection = localCollections.find(
        (collection) => collection.name === collectionName
      );
      if (!colorsCollection) {
        console.error(`Collection named "${collectionName}" not found.`);
        return "";
      }

      const colorVariables = await getColorVariables(
        colorsCollection.variableIds
      );
      return generateColorSchemeSCSS(collectionName, colorVariables, rgbToHex);
    });

    // Aggregate results
    const results = await Promise.all(collectionPromises);
    xmlContent = results.filter((content) => content !== "").join("\n");

    figma.ui.postMessage({
      type: MessageTypes.EXPORT_XML,
      xmlContent,
    });
    console.log(xmlContent);
  } catch (error) {
    console.error("Error exporting color collections:", error);
  }
}

// Helper Function - creates a list of SCSS variable declarations for each color
function createColorElements(
  variable: Variable,
  rgbToHex: (color: RGB | RGBA) => string
): string[] {
  const valuesByMode = variable.valuesByMode;
  const cleanVariableName = variable.name.split("/").pop();
  const scssVariables: string[] = [];

  for (const modeId in valuesByMode) {
    if (Object.prototype.hasOwnProperty.call(valuesByMode, modeId)) {
      const colorValue = valuesByMode[modeId] as RGB | RGBA;
      const hexString = rgbToHex(colorValue);
      // Create SCSS variable declaration
      scssVariables.push(`$${cleanVariableName}: ${hexString};`);
    }
  }
  return scssVariables;
}

// Helper Function - handles the creation of the main SCSS content of the color scheme
function createColorSchemeElement(
  collectionName: string,
  colorVariables: Variable[],
  rgbToHex: (color: RGB | RGBA) => string
): string {
  const scssDeclarations = colorVariables
    .flatMap((variable) => createColorElements(variable, rgbToHex))
    .join("\n"); // Join all SCSS variable declarations with new lines

  return `${scssDeclarations}`; // Return the combined SCSS declarations
}

// Core Function - builds the full SCSS Document
export function generateColorSchemeSCSS(
  collectionName: string,
  colorVariables: Variable[],
  rgbToHex: (color: RGB | RGBA) => string
): string {
  const colorSchemeElement = createColorSchemeElement(
    collectionName,
    colorVariables,
    rgbToHex
  );
  return `// Color Scheme: ${collectionName}\n${colorSchemeElement}`; // Add collection name as a comment
}
