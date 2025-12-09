import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/header.scss";

import requestsIcon from "../../assets/icons/list.svg";
import plannerIcon from "../../assets/icons/table.svg";
import userIcon from "../../assets/icons/user.svg";
import exitIcon from "../../assets/icons/exit.svg";

import { AuthContext } from "../../context/AuthContext";

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isGuest = !user;

  return (
    <header className="app-header-container">
      <div className="app-header">
        {/* ЛЕВЫЙ БЛОК */}
        <div className="header-left">
          {!isGuest && user.role === "organizer" && (
            <button
              className="head-btn head-btn--muted"
              onClick={() => navigate("/requests")}
            >
              <img src={requestsIcon} alt="requests" />
              <span>Заявки</span>
            </button>
          )}

          {!isGuest && (
            <button
              className="head-btn head-btn--muted"
              onClick={() => navigate("/planner")}
            >
              <img src={plannerIcon} alt="planner" />
              <span>Планировщик</span>
            </button>
          )}
        </div>

        {/* ЦЕНТР */}
        <div className="header-center">
          <img
            src="/src/assets/LogoIcon.svg"
            alt="logo"
            className="header-logo"
            onClick={() => navigate("/events")}
            style={{ cursor: "pointer" }}
          />
        </div>

        {/* ПРАВЫЙ БЛОК */}
        <div className="header-right">
          {isGuest ? (
            <>
              <button
                className="head-btn head-btn--muted"
                onClick={() => navigate("/login")}
              >
                Войти
              </button>
            </>
          ) : (
            <>
              {/* ПРОФИЛЬ */}
              <button
                className="profile-box"
                onClick={() => navigate("/profile")}
              >
                <img src={userIcon} alt="user" className="profile-icon" />
                <div className="profile-text">
                  <div className="role">
                    {user.role === "organizer" ? "Организатор" : "Студент"}
                  </div>
                  <div className="name">
                    {user.name} {user.surname || ""}
                  </div>
                </div>
              </button>

              {/* ВЫЙТИ */}
              <button
                className="head-btn head-btn--danger"
                onClick={() => {
                  logout();
                  navigate("/events");
                }}
              >
                <img src={exitIcon} alt="exit" />
                <span>Выйти</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
