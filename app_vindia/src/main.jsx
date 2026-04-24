import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // optional: uncomment for debug panel

import "./styles/global.css";
import "./styles/Layout.css";
import "./styles/Dashboard.css";
import "./styles/cards.css";
import "./styles/responsive.css";

// ─── Global React Query Config ──────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // ✅ Data stays "fresh" 5 min → no refetch on revisit
      gcTime: 1000 * 60 * 10,         // ✅ Keep unused data in memory 10 min (was cacheTime)
      retry: 2,                        // ✅ Auto-retry failed requests twice
      refetchOnWindowFocus: false,     // ✅ Don't refetch when user alt-tabs back
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      {/* ✅ Wrap entire app — all useQuery calls inherit the config above */}
      <QueryClientProvider client={queryClient}>
        <App />
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </AuthProvider>
  </BrowserRouter>
);