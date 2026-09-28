/* Theme handling. Imported once from main.jsx (`import "./utils/theme";`)
   so the saved theme is applied on every page load, before first paint
   of any page. */
import "../styles/dark-theme.css";

const KEY = "vindia_theme";

export const getTheme = () => {
  try { return localStorage.getItem(KEY) === "dark" ? "dark" : "light"; }
  catch { return "light"; }
};

export const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

export const setTheme = (theme) => {
  try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  applyTheme(theme);
};

applyTheme(getTheme());