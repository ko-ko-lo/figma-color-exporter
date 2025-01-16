# Hexify Plugin

_A simple tool to export Figma color collections to SCSS, CSS, or JSON._

For more details about the development process, visit the [Portfolio Page](https://creativejourney.dev/projects/figma-plugin-hexify).

Hexify is a Figma Plugin built to streamline the process of converting Color Collections into Code. It eliminates the repetitive task of manually copying colors by letting you export collections directly from Figma in a SCSS, CSS or JSON format.


![hexify-teaser](https://github.com/user-attachments/assets/4e03aca0-ee79-4d14-8120-c78f5b220e4e)


## How to use

- Select your Color Collection(s)
- Choose your Export Format (JSON, SCSS, or CSS)
- Click Generate Output to download your generated File

## Tech Stack

- **Figma API**: Retrieves and processes Color Collections.
- **TypeScript & Webpack**: Core Logic and Module Bundling.
- **HTML & CSS**: For the Plugin UI.

## Development Notes

**Hexify uses a modular architecture:**

- **UI Layer**: Handles user input and displays feedback.
- **UMain Logic (code.ts)**: Coordinates API calls and data processing.
- **Helper Modules:**:
   - api.ts fetches and filters color data.
   - utilities.ts formats colors to Hex and generates SCSS, CSS, or JSON.
 
  
