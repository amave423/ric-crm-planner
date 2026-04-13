import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./context/AuthContext";
import "./styles/global.scss";
import { ToastProvider } from "./components/Toast/ToastProvider";
import { NotificationsProvider } from "./context/NotificationsContext";

dayjs.locale("ru");

export default function App() {
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: "#6495ed",
          borderRadius: 10,
          fontFamily: "Inter, sans-serif",
        },
      }}
    >
      <AuthProvider>
        <NotificationsProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </NotificationsProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
