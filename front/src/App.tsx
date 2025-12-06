import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./context/AuthContext";
import "./styles/global.scss";

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
