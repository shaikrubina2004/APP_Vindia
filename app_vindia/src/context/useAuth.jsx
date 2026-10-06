import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrateEmployeeIdentity = async (baseUser) => {
    if (!baseUser?.id || !localStorage.getItem("token")) return baseUser;

    try {
      const response = await API.get("/employees/me");
      const employee = response.data || {};

      // The employee record is authoritative for the person's display name
      // and assignment. The account role remains authoritative for access.
      const hydrated = {
        ...baseUser,
        name: employee.employee_name || baseUser.name,
        employee_id: employee.employee_id || baseUser.employee_id || null,
        employee_name: employee.employee_name || baseUser.name || null,
        employee_email: employee.employee_email || baseUser.email || null,
        employee_department: employee.employee_department || null,
        department_id: employee.department_id || null,
        department_name: employee.department_name || null,
        designation: employee.designation || baseUser.designation || null,
        employee_status: employee.employee_status || null,
        profile_photo: employee.profile_photo || baseUser.profile_photo || null,
        role_name: employee.role_name || null,
      };

      localStorage.setItem("user", JSON.stringify(hydrated));
      return hydrated;
    } catch (error) {
      // Login should not fail just because the optional employee profile
      // hydration is unavailable. Existing account data remains usable.
      console.warn("Employee identity hydration skipped:", error?.response?.data?.message || error.message);
      return baseUser;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setLoading(false);
        return;
      }

      try {
        const baseUser = JSON.parse(storedUser);
        const hydrated = await hydrateEmployeeIdentity(baseUser);
        if (!cancelled) setUser(hydrated);
      } catch {
        localStorage.removeItem("user");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restore();
    return () => { cancelled = true; };
  }, []);

  const login = async (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    const hydrated = await hydrateEmployeeIdentity(userData);
    setUser(hydrated);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);