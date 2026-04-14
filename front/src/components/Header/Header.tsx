import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  BarsOutlined,
  BellOutlined,
  LoginOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "../../styles/header.scss";
import menuIcon from "../../assets/icons/menu.svg";
import { AuthContext } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import Modal from "../Modal/Modal";
import AppButton from "../UI/Button";

const HEADER_TEXT = {
  deleteAllNotifications:
    "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u0441\u0435",
} as const;

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const { notifications, unreadCount, markAllAsRead, markAsRead, removeNotification, clearNotifications } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!notificationsOpen) return;
    markAllAsRead();
  }, [notificationsOpen, markAllAsRead]);

  const goTo = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const mobileMenuItems: MenuProps["items"] = user
    ? [
        {
          key: "/requests",
          label: (
            <span className="mobile-menu-entry">
              <span className="mobile-menu-entry__icon">
                <BarsOutlined />
              </span>
              <span>{user.role === "student" ? "Мои заявки" : "Заявки"}</span>
            </span>
          ),
        },
        {
          key: "/planner",
          label: (
            <span className="mobile-menu-entry">
              <span className="mobile-menu-entry__icon">
                <TeamOutlined />
              </span>
              <span>Планировщик</span>
            </span>
          ),
        },
        {
          key: "/profile",
          label: (
            <span className="mobile-menu-entry">
              <span className="mobile-menu-entry__icon">
                <UserOutlined />
              </span>
              <span>Профиль</span>
            </span>
          ),
        },
      ]
    : [];

  const onMobileMenuClick: MenuProps["onClick"] = ({ key }) => {
    goTo(String(key));
  };

  const activeMobileMenuKey =
    ["/requests", "/planner", "/profile"].find((path) => location.pathname.startsWith(path)) ?? "";

  const openNotifications = () => {
    setMobileMenuOpen(false);
    setNotificationsOpen(true);
  };

  const openNotificationLink = (id: string, link?: string) => {
    markAsRead(id);
    if (!link) return;
    try {
      const url = new URL(link, window.location.origin);
      if (url.origin === window.location.origin) {
        setNotificationsOpen(false);
        navigate(`${url.pathname}${url.search}${url.hash}`);
        return;
      }
    } catch {
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const formatDateTime = (iso: string) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <header className={`app-header ${user ? "app-header--auth" : "app-header--guest"}`}>
      {user ? (
        <div className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
          <Dropdown
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            trigger={["click"]}
            placement="bottomLeft"
            classNames={{ root: "mobile-menu-dropdown" }}
            menu={{
              items: mobileMenuItems,
              selectedKeys: activeMobileMenuKey ? [activeMobileMenuKey] : [],
              onClick: onMobileMenuClick,
            }}
          >
            <AppButton className="mobile-menu-btn" aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}>
              <img src={menuIcon} alt="menu" />
            </AppButton>
          </Dropdown>
        </div>
      ) : (
        <div className="mobile-menu-spacer" aria-hidden />
      )}

      <div className="header-left">
        {user && (
          <>
            <AppButton className="head-btn head-btn--muted" onClick={() => navigate("/requests")}>
              <BarsOutlined />
              <span>{user.role === "student" ? "Мои заявки" : "Заявки"}</span>
            </AppButton>

            <AppButton className="head-btn head-btn--planner" onClick={() => navigate("/planner")}>
              <TeamOutlined />
              <span>Планировщик</span>
            </AppButton>
          </>
        )}
      </div>

      <div className="header-center">
        <AppButton className="header-logo" onClick={() => goTo("/")}>
          <img src="/src/assets/LogoIcon.png" alt="logo" className="header-logo-img" />
        </AppButton>
      </div>

      <div className="header-right">
        {user ? (
          <>
            <div className="profile-box" onClick={() => navigate("/profile")}>
              <UserOutlined className="profile-icon" />
              <div className="profile-text">
                <div className="role">{user.role === "organizer" ? "Организатор" : "Проектант"}</div>
                <div className="name">{user.name ? `${user.name} ${user.surname || ""}` : "Гость"}</div>
              </div>
            </div>

            <AppButton className="head-btn head-btn--notify" onClick={openNotifications} aria-label="Центр уведомлений">
              <Badge dot={unreadCount > 0} className="notification-badge">
                <BellOutlined />
              </Badge>
              <span>Уведомления</span>
            </AppButton>

            <AppButton
              className="head-btn head-btn--danger"
              onClick={() => {
                setMobileMenuOpen(false);
                void logout?.();
                navigate("/login");
              }}
            >
              <LogoutOutlined />
              <span>Выйти</span>
            </AppButton>
          </>
        ) : (
          <AppButton className="head-btn head-btn--login" onClick={() => navigate("/login")}>
            <LoginOutlined />
            <span>Войти</span>
          </AppButton>
        )}
      </div>

      <Modal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="Центр уведомлений">
        <div className="notification-center">
          {notifications.length === 0 ? (
            <div className="notification-empty">Пока нет уведомлений</div>
          ) : (
            <>
              <div className="notification-center__toolbar">
                <AppButton className="notification-clear-btn" onClick={clearNotifications}>
                  {HEADER_TEXT.deleteAllNotifications}
                </AppButton>
              </div>
              {notifications.map((n) => (
              <div key={n.id} className={`notification-item ${n.read ? "is-read" : "is-unread"}`}>
                <div className="notification-item__head">
                  <div className="notification-item__title">{n.title}</div>
                  <div className="notification-item__date">{formatDateTime(n.createdAt)}</div>
                </div>
                {n.message && <div className="notification-item__message">{n.message}</div>}
                <div className="notification-item__actions">
                  {n.link && user?.role !== "organizer" && (
                    <AppButton className="notification-link-btn" onClick={() => openNotificationLink(n.id, n.link)}>
                      Открыть ссылку
                    </AppButton>
                  )}
                  <AppButton className="notification-remove-btn" onClick={() => removeNotification(n.id)}>
                    Удалить
                  </AppButton>
                </div>
              </div>
              ))}
            </>
          )}
        </div>
      </Modal>
    </header>
  );
}
