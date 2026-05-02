import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSENotifications,
  markSENotificationRead,
  markAllSENotificationsRead,
} from "../../services/seNotificationService";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ FETCH FROM CORRECT API
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["se-notifications"],
    queryFn: fetchSENotifications,
    refetchInterval: 10000,
  });

  // ✅ MARK SINGLE
  const markReadMutation = useMutation({
    mutationFn: markSENotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries(["se-notifications"]);
    },
  });

  // ✅ MARK ALL
  const markAllMutation = useMutation({
    mutationFn: markAllSENotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries(["se-notifications"]);
    },
  });

  if (isLoading) return <p>Loading notifications...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>🔔 Notifications</h2>

      <button onClick={() => markAllMutation.mutate()}>Mark all as read</button>

      {notifications?.length === 0 && <p>No notifications</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {notifications?.map((n) => (
          <li
            key={n.id}
            onClick={() => {
              markReadMutation.mutate(n.id);
              navigate(n.link); // 🔥 magic happens here
            }}
            style={{
              background: n.is_read ? "#f1f5f9" : "#e0f2fe",
              marginBottom: "10px",
              padding: "12px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            <strong>{n.title}</strong>
            <p>{n.description}</p>
            <small>{new Date(n.created_at).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationsPage;
