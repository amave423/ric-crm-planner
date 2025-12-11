import { useState } from "react";
import { useParams } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import TableHeader from "../../components/Layout/TableHeader";
import Table from "../../components/Table/Table";
import { loadData } from "../../utils/storage";
import rawEvents from "../../mock-data/events.json";
import "../../components/BackButton/back-btn.scss";

export default function ProjectsPage() {
  const { eventId, directionId } = useParams();
  const [search, setSearch] = useState("");

  const events = loadData("events", rawEvents);
  const event = events.find((e: any) => String(e.id) === String(eventId));
  const direction = (event?.directions || []).find(
    (d: any) => String(d.id) === String(directionId)
  );

  const projects = (direction?.projects || []) as any[];

  const filtered = projects.filter((p) =>
    (p.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map((p: any) => ({
    id: p.id,
    title: p.title,
    event: event?.title || "",
    direction: direction?.title || "",
    curator: p.curator || "",
    teams: p.teams || "",
  }));

  const columns = [
    { key: "title", title: "Название", width: "232px" },
    { key: "event", title: "Мероприятие", width: "232px" },
    { key: "direction", title: "Направление", width: "232px" },
    { key: "curator", title: "Куратор", width: "232px" },
    { key: "teams", title: "Команды", width: "232px" },
  ];

  return (
    <div className="page page--projects">
      <BackButton to={`/events/${eventId}/directions`} label="Направления" />

      <TableHeader
        title={`${event?.title || ""} / ${direction?.title || ""} — Проекты`}
        search={search}
        onSearch={setSearch}
        onCreate={() => {
        }}
      />

      <Table columns={columns} data={rows} badgeKeys={[]} />
    </div>
  );
}
