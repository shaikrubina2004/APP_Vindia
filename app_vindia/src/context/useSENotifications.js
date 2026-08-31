import { useContext } from "react";
import { useAuth } from "./useAuth";  // ← Add this
import { SENotificationContext } from "./SENotificationContext";

export function useSENotifications() {
  const ctx = useContext(SENotificationContext);
  const { user } = useAuth();  // ← Add this

  if (!ctx) {
    throw new Error(
      "useSENotifications() must be used inside <SENotificationProvider>.\n" +
      "Make sure StructuralEngineerLayout wraps its children with <SENotificationProvider>."
    );
  }

  // ✅ NEW: Ensure only SE can use this hook
  if (user?.role !== "structural_engineer") {
    console.error("⚠️ User role is:", user?.role);
    throw new Error(
      "useSENotifications() can only be used by Structural Engineers.\n" +
      "Current user role: " + user?.role
    );
  }

  return ctx;
}