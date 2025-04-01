import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import { BrowserRouter } from "react-router-dom";
//Context
import AuthProvider from "./context/AuthContext";
import { SensorProvider } from "./context/SensorContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SensorProvider>
          <App />
        </SensorProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
