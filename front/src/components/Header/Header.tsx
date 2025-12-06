import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

import userIcon from "../../assets/icons/user.svg";
import logoIcon from "../../assets/LogoIcon.svg";

import "../../styles/header.scss";

export default function Header() {
  const { user } = useContext(AuthContext);

  return (
    <header className="top-header">
      <img src={logoIcon} alt="logo" className="header-logo" />

      {user ? (
        <Link to="/profile" className="profile-box">
          <img src={userIcon} className="user-icon" />
          <span className="text-small">
            {user.role === "student" ? "Студент: " : "Организатор: "}
            {user.name} {user.surname}
          </span>
        </Link>
      ) : (
        <Link to="/login" className="login-btn h3">
          Войти
        </Link>
      )}
    </header>
  );
}
