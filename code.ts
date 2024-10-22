/*
import * as ColorCollection from "./api";

//************************************************************************************************
// Initialization
//************************************************************************************************
figma.showUI(__html__);
figma.ui.resize(600, 600);

ColorCollection.populateDropdown();

//************************************************************************************************
// Update Function
//************************************************************************************************

// Helper function - processes and exports color collections based on the selected collections
async function updateColorCollection(
  selectedCollections: string[]
): Promise<void> {
  if (selectedCollections && selectedCollections.length > 0) {
    await ColorCollection.exportColorCollections(selectedCollections);
  }
}

//************************************************************************************************
// Messages Handling
//************************************************************************************************

const MessageTypes = {
  CREATE: "create",
  CANCEL: "cancel",
  TOGGLE_DROPDOWN: "toggleDropdown",
};

// Core function -  Event Handler, handles messages from the UI, performing different actions based on the input
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === MessageTypes.CREATE) {
      await handleCreateMessage(msg);
    } else if (msg.type === MessageTypes.CANCEL) {
      figma.closePlugin();
    } else if (msg.type === MessageTypes.TOGGLE_DROPDOWN) {
      ColorCollection.populateDropdown();
    }
  } catch (error) {
    console.error("Error handling message:", error);
    figma.notify("An error occurred. Please check the console for details.");
  }
};

// Core function - handles the 'create' message, checks whether there are selected color collections
async function handleCreateMessage(msg: any): Promise<void> {
  const selectedCollections = msg.collectionNames;

  if (selectedCollections && selectedCollections.length > 0) {
    await updateColorCollection(selectedCollections);
  } else {
    figma.notify("No Layer or Color Collection selected.");
  }
}

// Messages Handling
figma.ui.onmessage = async (msg) => {
  if (msg.type === "populateDropdown") {
    ColorCollection.populateDropdown();
  }
};
*/

// Show the UI
figma.showUI(__html__);
figma.ui.resize(600, 600);

// Function to send color collections to the UI
async function populateDropdown() {
  try {
    const localCollections =
      await figma.variables.getLocalVariableCollectionsAsync();

    const filteredCollections = localCollections.map((collection) => ({
      id: collection.id,
      name: collection.name,
    }));

    // Send collections to the UI
    figma.ui.postMessage({
      type: "populateDropdown",
      collections: filteredCollections,
    });

    console.log("Collections message sent to UI.");
  } catch (error) {
    console.error("Error in populateDropdown:", error);
  }
}

// Listen for messages from the UI
figma.ui.onmessage = (msg) => {
  // Handle UI ready message
  if (msg.type === "uiReady") {
    console.log("UI is ready, now populating the dropdown.");
    populateDropdown();
  }

  // Handle cancel message
  if (msg.type === "cancel") {
    console.log("Cancel button clicked. Closing plugin.");
    figma.closePlugin(); // Close the plugin when cancel is clicked
  }
};
