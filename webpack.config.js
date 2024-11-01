const path = require("path");

module.exports = {
  entry: "./src/code.ts",
  output: {
    filename: "code.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "this",
    iife: true, // Wraps the code in an IIFE (Immediately Invoked Function Expression)
  },
  mode: "production", // or "development"
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
};
