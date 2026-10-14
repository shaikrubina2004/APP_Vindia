// src/services/ceoClientService.js
// CEO Client Management API calls.
// Re-uses the shared axios instance (base URL + Bearer token interceptor)
// from services/api.js — no URLs or tokens are handled here.
import api from "./api";

const unwrap = (res) => res.data?.data ?? res.data;

/** Turns any axios error into a readable message for the UI. */
export const getApiErrorMessage = (err, fallback = "Something went wrong.") => {
  if (err?.response?.status === 401)
    return "Your session has expired. Please sign in again.";
  if (err?.response?.status === 403)
    return "You do not have permission to view client management.";
  if (err?.response?.status === 404)
    return err.response.data?.message || "The requested record was not found.";
  if (err?.code === "ERR_NETWORK")
    return "Cannot reach the server. Check your connection and try again.";
  return err?.response?.data?.message || fallback;
};

export const fetchClients = (params = {}, signal) =>
  api.get("/ceo/clients", { params, signal }).then(unwrap);

export const fetchClientDetails = (clientId, signal) =>
  api.get(`/ceo/clients/${clientId}`, { signal }).then(unwrap);

export const fetchClientProjects = (clientId, signal) =>
  api.get(`/ceo/clients/${clientId}/projects`, { signal }).then(unwrap);

export const fetchClientActivity = (clientId, signal) =>
  api.get(`/ceo/clients/${clientId}/activity`, { signal }).then(unwrap);

/**
 * Create a client account (CEO only — enforced by the backend).
 * Resolves with { client, email_sent, temporary_password? }.
 * On failure the axios error is re-thrown untouched so the form can read
 * err.response.data.errors (per-field messages) and err.response.status.
 */
export const createClient = (payload) =>
  api.post("/ceo/clients", payload).then(unwrap);