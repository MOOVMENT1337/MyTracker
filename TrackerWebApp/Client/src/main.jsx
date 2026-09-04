import React from "react";
import { createRoot } from "react-dom/client";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./styles/reset.css";
import "./styles/auth.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/modals.css";
import "./styles/drag-drop.css";
import "./styles/themes.css";
import "./styles/animations.css";
import "./styles/responsive.css";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
