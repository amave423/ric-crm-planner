import { NavLink } from "react-router-dom";
import searchIcon from "../../assets/icons/search.svg";
import "./table-header.scss";

interface Props {
  title: string;
  search: string;
  onSearch: (v: string) => void;
}

export default function TableHeader({ title, search, onSearch }: Props) {
  return (
    <div className="table-header">
      <h1 className="h1">{title}</h1>

      <div className="right-controls">
        <div className="search-input">
          <input
            type="text"
            placeholder="Поиск"
            value={search}
            className="text-regular"
            onChange={(e) => onSearch(e.target.value)}
          />
          <img src={searchIcon} alt="search" />
        </div>

        <div className="tabs">
          <NavLink to="/events" className={({isActive}) => isActive ? "tab active text-regular" : "tab text-regular"}>
            Мероприятия
          </NavLink>

          <NavLink to="/directions" className={({isActive}) => isActive ? "tab active text-regular" : "tab text-regular"}>
            Направления
          </NavLink>

          <NavLink to="/projects" className={({isActive}) => isActive ? "tab active text-regular" : "tab text-regular"}>
            Проекты
          </NavLink>
        </div>
      </div>
    </div>
  );
}
