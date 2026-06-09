import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // ✅ Import BrowserRouter
import App from "./App.tsx";
import ErrorBoundary from './components/ErrorBoundary.tsx';
import "./index.css";


const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <ErrorBoundary>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </BrowserRouter>
  </ErrorBoundary>
);
