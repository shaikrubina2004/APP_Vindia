import axios from "axios";

const BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export const fetchUsersByRole = async (role) => {
  const token = localStorage.getItem("token");

  const res = await axios.get(
    `${BASE}/api/users/by-role/${role}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};