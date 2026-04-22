import AppRoutes from "./routes/AppRoutes"
import { NotificationProvider } from "./context/useNotifications";

function App() {
  return (
    <NotificationProvider>
      <AppRoutes />
    </NotificationProvider>
  )
}

export default App