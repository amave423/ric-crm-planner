import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

import BackButton from "../../components/BackButton/BackButton";
import TableHeader from "../../components/Layout/TableHeader";
import Table from "../../components/Table/Table";

import rawEvents from "../../mock-data/events.json";
import { loadData } from "../../utils/storage";

export default function DirectionsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  // Загружаем события и берём направления из нужного события
  const allEvents = loadData("events", rawEvents);
  const event = allEvents.find((e) => e.id === Number(eventId));
  const directions = event?.directions || [];

  const filtered = directions.filter((d) =>
    (d.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page page--directions">
      <BackButton to="/events" label="Мероприятия" />

      <TableHeader
        title="Направления"
        search={search}
        onSearch={setSearch}
        hideCreate={false}
      />

      <Table
        columns={[
          { key: "title", title: "Название", width: "240px" },
          { key: "projectsCount", title: "Проекты", width: "240px" },
          { key: "organizer", title: "Организатор", width: "240px" },
        ]}
        data={filtered}
        badgeKeys={["projectsCount"]}
        onRowClick={(row) =>
          navigate(`/events/${eventId}/directions/${row.id}/projects`)
        }
        onInfoClick={() => {}}
      />
    </div>
  );
}
