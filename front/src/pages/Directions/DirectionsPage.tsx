import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import TableHeader from "../../components/Layout/TableHeader";
import Table from "../../components/Table/Table";
import { loadData } from "../../utils/storage";
import rawEvents from "../../mock-data/events.json";
import "../../components/BackButton/back-btn.scss";

export default function DirectionsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const events = loadData("events", rawEvents);
  const event = events.find((e: any) => String(e.id) === String(eventId));

  const directions = event?.directions || [];

  const filtered = directions.filter((d: any) =>
    (d.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map((d: any) => ({
    id: d.id,
    title: d.title,
    event: event?.title || "",
    projects: (d.projects || []).map((p: any) => p.title).join(", "),
    organizer: d.organizer || "",
  }));

  const columns = [
    { key: "title", title: "Название", width: "290px" },
    { key: "event", title: "Мероприятие", width: "290px" },
    { key: "projects", title: "Проекты", width: "290px" },
    { key: "organizer", title: "Организатор", width: "290px" },
  ];

  return (
    <div className="page page--directions">
      <BackButton to="/events" label="Мероприятия" />

      <TableHeader
        title={`${event?.title || "Мероприятие"} — Направления`}
        search={search}
        onSearch={setSearch}
        onCreate={() => {
        }}
      />

      <Table
        columns={columns}
        data={rows}
        badgeKeys={["projects"]}
        onRowClick={(row: any) =>
          navigate(`/events/${eventId}/directions/${row.id}/projects`)
        }
      />
    </div>
  );
}
