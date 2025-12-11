import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/header.scss";
import requestsIcon from "../../assets/icons/list.svg";
import plannerIcon from "../../assets/icons/table.svg";
import userIcon from "../../assets/icons/user.svg";
import exitIcon from "../../assets/icons/exit.svg";
import { AuthContext } from "../../context/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="head-btn head-btn--muted" onClick={() => navigate("/requests")}>
          <img src={requestsIcon} alt="requests" />
          <span>Заявки</span>
        </button>

        <button className="head-btn head-btn--muted" onClick={() => navigate("/planner")}>
          <img src={plannerIcon} alt="planner" />
          <span>Планировщик</span>
        </button>
      </div>

      <div className="header-center">
        <img src="/src/assets/LogoIcon.svg" alt="logo" className="header-logo" />
      </div>

      <div className="header-right">
        <div className="profile-box" onClick={() => navigate("/profile")}>
          <img src={userIcon} alt="user" className="profile-icon" />
          <div className="profile-text">
              <div className="role">{user?.role === "organizer" ? "Организатор" : "Студент"}</div>
              <div className="name">{user?.name ? `${user.name} ${user.surname || ""}` : "Гость"}</div>
          </div>
        </div>


        <button
          className="head-btn head-btn--danger"
          onClick={() => {
            logout?.();
            navigate("/login");
          }}
        >
          <img src={exitIcon} alt="exit" />
          <span>Выйти</span>
        </button>
      </div>
    </header>
  );
}
