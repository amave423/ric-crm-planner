import "./table-controls.scss";
import AppButton from "../UI/Button";
import { AppSearch } from "../UI/Input";
import AppSelect from "../UI/Select";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  sortKey: string;
  onSort: (key: string) => void;
  sortOptions: { key: string; title: string }[];
  onCreate: () => void;
  createLabel: string;
}

export default function TableControls({
  search,
  onSearch,
  sortKey,
  onSort,
  sortOptions,
  onCreate,
  createLabel,
}: Props) {
  return (
    <div className="table-controls">
      <AppSearch
        placeholder="Поиск..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      <AppSelect
        value={sortKey}
        onChange={(value) => onSort(String(value))}
        options={sortOptions.map((s) => ({ value: s.key, label: s.title }))}
      />

      <AppButton className="create-btn" onClick={onCreate}>
        {createLabel}
      </AppButton>
    </div>
  );
}
