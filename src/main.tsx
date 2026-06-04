import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
// Bundled Inter font (no network fetch — suits an offline Tauri app).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
