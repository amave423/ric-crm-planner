import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

import BackButton from "../../components/BackButton/BackButton";
import TableHeader from "../../components/Layout/TableHeader";
import Table from "../../components/Table/Table";

import rawEvents from "../../mock-data/events.json";
import { loadData } from "../../utils/storage";

export default function ProjectsPage() {
  const { eventId, directionId } = useParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  // Получаем событие и направление, затем проекты из направления
  const allEvents = loadData("events", rawEvents);
  const event = allEvents.find((e) => e.id === Number(eventId));
  const direction = event?.directions?.find((d) => d.id === Number(directionId));
  const projects = direction?.projects || [];

  const filtered = projects.filter((p) =>
    (p.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page page--projects">
      <BackButton
        to={`/events/${eventId}/directions`}
        label="Направления"
      />

      <TableHeader
        title="Проекты"
        search={search}
        onSearch={setSearch}
        hideCreate={false}
      />

      <Table
        columns={[
          { key: "title", title: "Название", width: "240px" },
          { key: "curator", title: "Куратор", width: "240px" },
          { key: "teamCount", title: "Команды", width: "240px" },
        ]}
        data={filtered}
        badgeKeys={["teamCount"]}
        onInfoClick={() => {}}
      />
    </div>
  );
}
