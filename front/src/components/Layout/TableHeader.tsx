import plusIcon from "../../assets/icons/plus.svg";
import searchIcon from "../../assets/icons/search.svg";
import "../../styles/table-header.scss";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

interface Props {
  title: string;
  search: string;
  onSearch: (v: string) => void;
  onCreate?: () => void;
  hideCreate?: boolean;
}

export default function TableHeader({ title, search, onSearch, onCreate, hideCreate }: Props) {
  const { user } = useContext(AuthContext);

  return (
    <div className="table-header">
      <div className="left-side">
        <h1 className="h1">{title}</h1>
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

        {user?.role === "organizer" && onCreate && !hideCreate && (
          <button className="create-btn" onClick={onCreate}>
            <img src={plusIcon} alt="+" />
          </button>
        )}
      </div>
    </div>
  );
}
