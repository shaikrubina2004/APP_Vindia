// FILE PATH: src/context/SENotificationContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ONLY exports the context object — no components, no providers.
// This fixes the ESLint fast-refresh warning:
//   "Fast refresh only works when a file only exports components."
// ─────────────────────────────────────────────────────────────────────────────

import { createContext } from "react";

export const SENotificationContext = createContext(null);