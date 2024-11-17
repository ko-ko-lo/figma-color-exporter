# Hexify Plugin

_A simple tool to export Figma color collections to SCSS, CSS, or JSON._

Hexify is a Figma plugin built to streamline the process of converting color collections into code. It eliminates the repetitive task of manually copying colors by letting you export collections directly from Figma in a SCSS, CSS or JSON format.


![hexify-teaser](https://github.com/user-attachments/assets/4e03aca0-ee79-4d14-8120-c78f5b220e4e)


## How to use

- Select your color collection(s)
- Choose your export format (JSON, SCSS, or CSS)
- Click Generate Output to download your color variables

## Tech Stack

- **Figma API**: Retrieves and processes color collections.
- **TypeScript & Webpack**: Core logic and module bundling.
- **HTML & CSS**: For the plugin UI.

## Development Notes

**Hexify uses a modular architecture:**

- **UI Layer**: Handles user input and displays feedback.
- **UMain Logic (code.ts)**: Coordinates API calls and data processing.
- **Helper Modules:**:
   - api.ts fetches and filters color data.
   - utilities.ts formats colors to Hex and generates SCSS, CSS, or JSON.
 
  
