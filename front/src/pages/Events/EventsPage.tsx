import { useState } from "react";
import { useNavigate } from "react-router-dom";
import rawEvents from "../../mock-data/events.json";
import { loadData } from "../../utils/storage";
import TableHeader from "../../components/Layout/TableHeader";
import Table from "../../components/Table/Table";
import "../../styles/page-colors.scss";

export default function EventsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [events] = useState(loadData("events", rawEvents));

  const filtered = events.filter((e: any) => (e.title || "").toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: "title", title: "Название", width: "232px" },
    { key: "startDate", title: "Дата начала мероприятия", width: "232px" },
    { key: "endDate", title: "Дата окончания мероприятия", width: "232px" },
    { key: "organizer", title: "Организатор", width: "232px" },
    { key: "status", title: "Статус мероприятия", width: "232px" }
  ];

  return (
    <div className="page page--events">
      <TableHeader title="Мероприятия" search={search} onSearch={setSearch} />
      <Table
        columns={columns}
        data={filtered}
        badgeKeys={["startDate","endDate","status"]}
        onRowClick={(row:any) => navigate(`/events/${row.id}/directions`)}
        onEdit={(row) => navigate(`/events/${row.id}/edit`)}
      />
    </div>
  );
}
