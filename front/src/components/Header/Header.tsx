import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  BarsOutlined,
  BellOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "../../styles/header.scss";
import { AuthContext } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import Modal from "../Modal/Modal";
import AppButton from "../UI/Button";

const HEADER_TEXT = {
  automation: "Автоматизация",
  closeMenu: "Закрыть меню",
  delete: "Удалить",
  deleteAllNotifications: "Удалить все",
  guest: "Гость",
  login: "Войти",
  logout: "Выйти",
  myRequests: "Мои заявки",
  noNotifications: "Пока нет уведомлений",
  notificationCenter: "Центр уведомлений",
  notifications: "Уведомления",
  openLink: "Открыть ссылку",
  openMenu: "Открыть меню",
  organizer: "Организатор",
  planner: "Планировщик",
  profile: "Профиль",
  projectant: "Проектант",
  requests: "Заявки",
} as const;

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const { notifications, unreadCount, markAllAsRead, markAsRead, removeNotification, clearNotifications } =
    useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const canManageAutomation = Boolean(user && user.role !== "student");

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
              <span>{user.role === "student" ? HEADER_TEXT.myRequests : HEADER_TEXT.requests}</span>
            </span>
          ),
        },
        ...(canManageAutomation
          ? [
              {
                key: "/automation",
                label: (
                  <span className="mobile-menu-entry">
                    <span className="mobile-menu-entry__icon">
                      <SettingOutlined />
                    </span>
                    <span>{HEADER_TEXT.automation}</span>
                  </span>
                ),
              },
            ]
          : []),
        {
          key: "/planner",
          label: (
            <span className="mobile-menu-entry">
              <span className="mobile-menu-entry__icon">
                <TeamOutlined />
              </span>
              <span>{HEADER_TEXT.planner}</span>
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
              <span>{HEADER_TEXT.profile}</span>
            </span>
          ),
        },
      ]
    : [];

  const onMobileMenuClick: MenuProps["onClick"] = ({ key }) => {
    goTo(String(key));
  };

  const activeMobileMenuKey =
    ["/planner", "/automation", "/requests", "/profile"].find((path) => location.pathname.startsWith(path)) ?? "";

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
            <AppButton className="mobile-menu-btn" aria-label={mobileMenuOpen ? HEADER_TEXT.closeMenu : HEADER_TEXT.openMenu}>
              <MenuOutlined />
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
              <span>{user.role === "student" ? HEADER_TEXT.myRequests : HEADER_TEXT.requests}</span>
            </AppButton>

            {canManageAutomation && (
              <AppButton className="head-btn head-btn--automation" onClick={() => navigate("/automation")}>
                <SettingOutlined />
                <span>{HEADER_TEXT.automation}</span>
              </AppButton>
            )}

            <AppButton className="head-btn head-btn--planner" onClick={() => navigate("/planner")}>
              <TeamOutlined />
              <span>{HEADER_TEXT.planner}</span>
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
                <div className="role">{user.role === "organizer" ? HEADER_TEXT.organizer : HEADER_TEXT.projectant}</div>
                <div className="name">{user.name ? `${user.name} ${user.surname || ""}` : HEADER_TEXT.guest}</div>
              </div>
            </div>

            <AppButton className="head-btn head-btn--notify" onClick={openNotifications} aria-label={HEADER_TEXT.notificationCenter}>
              <Badge dot={unreadCount > 0} className="notification-badge">
                <BellOutlined />
              </Badge>
              <span>{HEADER_TEXT.notifications}</span>
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
              <span>{HEADER_TEXT.logout}</span>
            </AppButton>
          </>
        ) : (
          <AppButton className="head-btn head-btn--login" onClick={() => navigate("/login")}>
            <LoginOutlined />
            <span>{HEADER_TEXT.login}</span>
          </AppButton>
        )}
      </div>

      <Modal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} title={HEADER_TEXT.notificationCenter}>
        <div className="notification-center">
          {notifications.length === 0 ? (
            <div className="notification-empty">{HEADER_TEXT.noNotifications}</div>
          ) : (
            <>
              <div className="notification-center__toolbar">
                <AppButton className="notification-clear-btn" onClick={clearNotifications}>
                  {HEADER_TEXT.deleteAllNotifications}
                </AppButton>
              </div>
              {notifications.map((notification) => (
                <div key={notification.id} className={`notification-item ${notification.read ? "is-read" : "is-unread"}`}>
                  <div className="notification-item__head">
                    <div className="notification-item__title">{notification.title}</div>
                    <div className="notification-item__date">{formatDateTime(notification.createdAt)}</div>
                  </div>
                  {notification.message && <div className="notification-item__message">{notification.message}</div>}
                  <div className="notification-item__actions">
                    {notification.link && user?.role !== "organizer" && (
                      <AppButton
                        className="notification-link-btn"
                        onClick={() => openNotificationLink(notification.id, notification.link)}
                      >
                        {HEADER_TEXT.openLink}
                      </AppButton>
                    )}
                    <AppButton className="notification-remove-btn" onClick={() => removeNotification(notification.id)}>
                      {HEADER_TEXT.delete}
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
