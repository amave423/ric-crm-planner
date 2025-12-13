import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

import { getDirectionsByEvent } from "../../api/directions";
import { getEventById } from "../../api/events";

import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import BackButton from "../../components/UI/BackButton";
import EventWizard from "../../components/EventWizard/EventWizardModal";

import "../../styles/page-colors.scss";

export default function DirectionsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const eventIdNum = Number(eventId);

  const event = getEventById(eventIdNum);
  const directions = getDirectionsByEvent(eventIdNum);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  return (
    <div className="page page--directions">
      <TableHeader
        title={
          <>
            <BackButton onClick={() => navigate("/events")} />
            {`${event?.title || "Мероприятие"} — Направления`}
          </>
        }
        onCreate={() => {
          setEditData(null);
          setWizardOpen(true);
        }}
      />

      <Table
        columns={[
          { key: "title", title: "Название" },
          { key: "organizer", title: "Организатор" }
        ]}
        data={directions}
        onRowClick={(row) =>
          navigate(`/events/${eventId}/directions/${row.id}/projects`)
        }
        onEdit={(row) => {
          setEditData(row);
          setWizardOpen(true);
        }}
      />

      {wizardOpen && (
        <EventWizard
          mode={editData ? "edit" : "create"}
          initialData={editData}
          parentId={eventIdNum}
          entity="direction"
          onClose={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}
