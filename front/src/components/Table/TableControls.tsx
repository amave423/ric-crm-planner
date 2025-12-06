import "./table-controls.scss";

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
  createLabel
}: Props) {
  return (
    <div className="table-controls">
      <input
        type="text"
        placeholder="Поиск..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      <select value={sortKey} onChange={(e) => onSort(e.target.value)}>
        {sortOptions.map((s) => (
          <option key={s.key} value={s.key}>{s.title}</option>
        ))}
      </select>

      <button className="create-btn" onClick={onCreate}>
        {createLabel}
      </button>
    </div>
  );
}
