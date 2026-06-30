import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthGate } from "./components/AuthGate";
import { LedgerProvider } from "./context/LedgerContext";
import "./styles.css";

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister())),
  );
  if ("caches" in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>
      <LedgerProvider>
        <App />
      </LedgerProvider>
    </AuthGate>
  </StrictMode>,
);
