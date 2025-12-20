import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./context/AuthContext";
import "./styles/global.scss";
import { ToastProvider } from "./components/Toast/ToastProvider";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}
