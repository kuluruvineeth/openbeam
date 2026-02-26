import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element for side panel.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
