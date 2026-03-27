import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/header.scss";
import requestsIcon from "../../assets/icons/list.svg";
import plannerIcon from "../../assets/icons/table.svg";
import userIcon from "../../assets/icons/user.svg";
import exitIcon from "../../assets/icons/exit.svg";
import menuIcon from "../../assets/icons/menu.svg";
import notificationIcon from "../../assets/icons/notification.svg";
import { AuthContext } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import Modal from "../Modal/Modal";

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { notifications, unreadCount, markAllAsRead, markAsRead, removeNotification } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const onOutside = (e: MouseEvent) => {
      if (!mobileMenuRef.current) return;
      if (!mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };

    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    markAllAsRead();
  }, [notificationsOpen, markAllAsRead]);

  const goTo = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

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
        <div className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`} ref={mobileMenuRef}>
          <button className="mobile-menu-btn" aria-label="Открыть меню" onClick={() => setMobileMenuOpen((prev) => !prev)}>
            <img src={menuIcon} alt="menu" />
          </button>

          <div className="mobile-menu-panel">
            <button className="mobile-menu-item" onClick={() => goTo("/requests")}>
              <img src={requestsIcon} alt="requests" />
              <span>{user?.role === "student" ? "Мои заявки" : "Заявки"}</span>
            </button>
            <button className="mobile-menu-item" onClick={() => goTo("/planner")}>
              <img src={plannerIcon} alt="planner" />
              <span>Планировщик</span>
            </button>
            <button className="mobile-menu-item" onClick={() => goTo("/profile")}>
              <img src={userIcon} alt="profile" />
              <span>Профиль</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mobile-menu-spacer" aria-hidden />
      )}

      <div className="header-left">
        {user && (
          <>
            <button className="head-btn head-btn--muted" onClick={() => navigate("/requests")}>
              <img src={requestsIcon} alt="requests" />
              <span>{user?.role === "student" ? "Мои заявки" : "Заявки"}</span>
            </button>

            <button className="head-btn head-btn--muted" onClick={() => navigate("/planner")}>
              <img src={plannerIcon} alt="planner" />
              <span>Планировщик</span>
            </button>
          </>
        )}
      </div>

      <div className="header-center">
        <button className="header-logo" onClick={() => goTo("/")}>
          <img src="/src/assets/LogoIcon.png" alt="logo" className="header-logo" />
        </button>
      </div>

      <div className="header-right">
        {user ? (
          <>
            <div className="profile-box" onClick={() => navigate("/profile")}>
              <img src={userIcon} alt="user" className="profile-icon" />
              <div className="profile-text">
                <div className="role">{user?.role === "organizer" ? "Организатор" : "Проектант"}</div>
                <div className="name">{user?.name ? `${user.name} ${user.surname || ""}` : "Гость"}</div>
              </div>
            </div>

            <button className="head-btn head-btn--notify" onClick={openNotifications} aria-label="Центр уведомлений">
              <img src={notificationIcon} alt="notifications" />
              <span>Уведомления</span>
              {unreadCount > 0 && <span className="notify-dot" />}
            </button>

            <button
              className="head-btn head-btn--danger"
              onClick={() => {
                setMobileMenuOpen(false);
                void logout?.();
                navigate("/login");
              }}
            >
              <img src={exitIcon} alt="exit" />
              <span>Выйти</span>
            </button>
          </>
        ) : (
          <button className="head-btn head-btn--login" onClick={() => navigate("/login")}>
            <span>Войти</span>
          </button>
        )}
      </div>

      <Modal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="Центр уведомлений">
        <div className="notification-center">
          {notifications.length === 0 ? (
            <div className="notification-empty">Пока нет уведомлений</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`notification-item ${n.read ? "is-read" : "is-unread"}`}>
                <div className="notification-item__head">
                  <div className="notification-item__title">{n.title}</div>
                  <div className="notification-item__date">{formatDateTime(n.createdAt)}</div>
                </div>
                {n.message && <div className="notification-item__message">{n.message}</div>}
                <div className="notification-item__actions">
                  {n.link && (
                    <button className="notification-link-btn" onClick={() => openNotificationLink(n.id, n.link)}>
                      Открыть ссылку
                    </button>
                  )}
                  <button className="notification-remove-btn" onClick={() => removeNotification(n.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </header>
  );
}

