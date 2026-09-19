import { AdminPage } from "./AdminPage";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@fontsource-variable/nunito/wght.css";
import "@fontsource-variable/baloo-2/wght.css";
import "./styles.css";
import "./design.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {location.pathname === "/login" || location.pathname === "/admin" ? <AdminPage /> : <App />}
  </StrictMode>,
);
