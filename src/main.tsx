import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

// Using HashRouter so the SPA can be hosted at any sub-path (e.g. GitHub
// Pages' /web-veloxis-ai/) without per-route server config. Routes will look
// like /#/course/3.6 instead of /course/3.6.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
