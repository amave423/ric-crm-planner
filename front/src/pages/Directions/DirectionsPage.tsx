import { useParams, useNavigate } from "react-router-dom";
import { getDirectionsByEvent } from "../../api/directions";
import { getEventById } from "../../api/events";
import { useState } from "react";

import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import BackButton from "../../components/UI/BackButton";
import EventWizardModal, { type WizardLaunchContext } from "../../components/EventWizard/EventWizardModal";

import "../../styles/page-colors.scss";

export default function DirectionsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const eventIdNum = Number(eventId);
  const [search, setSearch] = useState("");

  const event = getEventById(eventIdNum);
  const directions = getDirectionsByEvent(eventIdNum);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContext, setWizardContext] = useState<WizardLaunchContext | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const filteredDirections = !search.trim()
  ? directions
  : directions.filter(d =>
      (d.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.organizer || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="page page--directions">
      <TableHeader
        title={
          <>
            <BackButton onClick={() => navigate("/events")} />
            {`${event?.title || "Мероприятие"} — Направления`}
          </>
        }
        search={search}
        onSearch={setSearch}
        onCreate={() => {
          setMode("create");
          setWizardContext({ type: "direction", eventId: eventIdNum });
          setWizardOpen(true);
        }}
      />

      <Table
        columns={[
          { key: "title", title: "Название" },
          { key: "organizer", title: "Организатор" }
        ]}
        data={filteredDirections}
        onRowClick={(row) =>
          navigate(`/events/${eventId}/directions/${row.id}/projects`)
        }
        onEdit={(row) => {
          setMode("edit");
          setWizardContext({
            type: "direction",
            eventId: eventIdNum,
            directionId: row.id
          });
          setWizardOpen(true);
        }}
      />

      {wizardOpen && wizardContext && (
        <EventWizardModal
          mode={mode}
          context={wizardContext}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}
