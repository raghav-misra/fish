import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import { bindSocket } from "./store.js";
import "./index.css";

bindSocket();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
