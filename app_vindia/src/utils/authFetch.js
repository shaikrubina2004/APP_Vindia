// utils/authFetch.js
//
// Drop-in replacement for window.fetch that attaches the logged-in user's
// JWT. Several pages (Milestone, WBS, PC notification bell) used bare fetch()
// and therefore sent no token, which only worked because the backend routes
// were unprotected.

export const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};

export default authFetch;