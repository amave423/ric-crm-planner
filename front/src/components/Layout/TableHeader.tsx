import plusIcon from "../../assets/icons/plus.svg";
import searchIcon from "../../assets/icons/search.svg";
import "../../styles/table-header.scss";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  title: string;
  search: string;
  onSearch: (v: string) => void;
  active: string;
  onChangeTab: (v: string) => void;
  onCreate?: () => void;
}

export default function TableHeader({
  title,
  search,
  onSearch,
  active,
  onChangeTab,
  onCreate
}: Props) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const go = (tab: string) => {
    onChangeTab(tab);
    // смена маршрута чтобы контент был связанный с URL
    if (tab === "events") navigate("/events");
    if (tab === "directions") navigate("/directions");
    if (tab === "projects") navigate("/projects");
  };

  return (
    <div className="table-header">
      <div className="left-side">
        <h1 className="h1">{title}</h1>

        {user?.role === "organizer" && onCreate && (
          <button className="create-btn" onClick={onCreate} title="Создать">
            <img src={plusIcon} alt="+" />
          </button>
        )}
      </div>

      <div className="right-side">
        <div className="search-box">
          <input
            placeholder="Поиск"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="text-regular"
          />
          <img src={searchIcon} alt="search" />
        </div>

        <div className="tabs">
          <button
            className={`tab events ${active === "events" ? "active" : ""}`}
            onClick={() => go("events")}
          >
            Мероприятия
          </button>

          <button
            className={`tab directions ${active === "directions" ? "active" : ""}`}
            onClick={() => go("directions")}
          >
            Направления
          </button>

          <button
            className={`tab projects ${active === "projects" ? "active" : ""}`}
            onClick={() => go("projects")}
          >
            Проекты
          </button>
        </div>
      </div>
    </div>
  );
}