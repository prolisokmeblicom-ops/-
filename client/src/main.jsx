import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PublicRouteSheetPage from "./PublicRouteSheetPage";
import "./styles.css";

const isPublicRouteSheet = window.location.pathname.startsWith("/route-sheet/");
const RootComponent = isPublicRouteSheet ? PublicRouteSheetPage : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
