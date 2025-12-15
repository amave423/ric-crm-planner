import "../../styles/table-header.scss";
import plusIcon from "../../assets/icons/plus.svg";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import searchIcon from "../../assets/icons/search.svg";

interface Props {
  title: React.ReactNode;
  search?: string;
  onSearch?: (v: string) => void;
  onCreate?: () => void;
}

export default function TableHeader({
  title,
  search,
  onSearch,
  onCreate
}: Props) {
  const { user } = useContext(AuthContext);
  const isOrganizer = user?.role === "organizer";

  return (
    <div className="table-header">
      <div className="left-side">
        <h1 className="h1">{title}</h1>

        {isOrganizer && onCreate && (
          <button className="create-btn" onClick={onCreate}>
            <img src={plusIcon} alt="add" />
          </button>
        )}
      </div>

      {search !== undefined && (
        <div className="right-side">
          <div className="search-box">
            <input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => onSearch?.(e.target.value)}
            />
            <img src={searchIcon} alt="search" />
          </div>
        </div>
      )}
    </div>
  );
}
