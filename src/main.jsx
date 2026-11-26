import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { installNativePlugins } from "./lib/native.js";
import { startWatchSync } from "./shared/wear.js";
import { captureInstallPrompt } from "./lib/webApp.js";

installNativePlugins();
// Browser only: keep Chrome's install prompt for the Install button.
captureInstallPrompt();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Wear OS watch link (Android app only): plan to the watch, runs from the watch.
setTimeout(startWatchSync, 1500);
