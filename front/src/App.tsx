import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./context/AuthContext";
import "./styles/global.scss";
import { ToastProvider } from "./components/Toast/ToastProvider";
import { NotificationsProvider } from "./context/NotificationsContext";

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
