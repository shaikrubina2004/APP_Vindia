export const fetchNotifications = async () => {
  const res = await fetch("http://localhost:5000/api/structural/notifications");
  return res.json();
};

export const markNotificationRead = async (id) => {
  await fetch(
    `http://localhost:5000/api/structural/notifications/${id}/read`,
    {
      method: "PATCH",
    }
  );
};