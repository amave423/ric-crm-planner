import { useParams, useNavigate } from "react-router-dom";
import { getDirectionsByEvent } from "../../api/directions";
import { getEventById } from "../../api/events";

import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import BackButton from "../../components/UI/BackButton";

import "../../styles/page-colors.scss";

export default function DirectionsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const eventIdNum = Number(eventId);

  const event = getEventById(eventIdNum);
  const directions = getDirectionsByEvent(eventIdNum);

  return (
    <div className="page page--directions">
      <TableHeader
        title={
          <>
            <BackButton onClick={() => navigate("/events")} />
            {`${event?.title || "Мероприятие"} — Направления`}
          </>
        }
        showCreate
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
      />
    </div>
  );
}
