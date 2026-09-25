import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/useAuth"; // ✅ FIXED
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./styles/global.css";
import "./styles/Layout.css";
import "./styles/Dashboard.css";
import "./styles/cards.css";
import "./styles/responsive.css";

/* ── GLOBAL AUTH HEADER ──────────────────────────────────────
   Many pages (e.g. the BDA module) call plain `axios.get(...)`
   directly instead of the pre-configured instance in
   services/authService.js, so they never sent the JWT. The
   backend now requires a valid token on protected routes
   (see backend/routes/leadRoutes.js), so we attach it here
   once, globally, for every axios call in the app. */
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AuthProvider>
  </BrowserRouter>
);