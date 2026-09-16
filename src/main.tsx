import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./store/AppStore";
import { ActiveTimerProvider } from "./components/ActiveTimerProvider";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConfirmDialog } from "./components/ConfirmDialog";
import "./styles.css";
import "./refinements.css";
import "./design-system.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AppProvider>
        <ActiveTimerProvider>
          <App />
          <ConfirmDialog />
        </ActiveTimerProvider>
      </AppProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
