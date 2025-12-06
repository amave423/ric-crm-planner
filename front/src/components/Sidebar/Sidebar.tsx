import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

import listIcon from "../../assets/icons/list.svg";
import tableIcon from "../../assets/icons/table.svg";
import exitIcon from "../../assets/icons/exit.svg";

import "../../styles/sidebar.scss";

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <aside className="sidebar">
      <nav className="menu">
        <NavLink to="/events" className={({isActive}) => isActive ? "menu-item active text-regular" : "menu-item text-regular"}>
          <img src={listIcon} alt="" /> Мероприятия
        </NavLink>

        {user && (
          <>
            <NavLink to="/directions" className={({isActive}) => isActive ? "menu-item active text-regular" : "menu-item text-regular"}>
              <img src={listIcon} alt="" /> Направления
            </NavLink>

            <NavLink to="/projects" className={({isActive}) => isActive ? "menu-item active text-regular" : "menu-item text-regular"}>
              <img src={listIcon} alt="" /> Проекты
            </NavLink>

            <div className="divider" />

            <NavLink to="/applications" className={({isActive}) => isActive ? "menu-item active text-regular" : "menu-item text-regular"}>
              <img src={listIcon} alt="" /> Заявки
            </NavLink>

            <div className="divider" />

            <NavLink to="/planner" className={({isActive}) => isActive ? "menu-item active text-regular" : "menu-item text-regular"}>
              <img src={tableIcon} alt="" /> Планировщик
            </NavLink>

            <div className="divider" />
          </>
        )}
      </nav>

      {user ? (
        <button className="exit-btn text-regular" onClick={logout}>
          <img src={exitIcon} alt="" /> Выйти
        </button>
      ) : null}
    </aside>
  );
}
