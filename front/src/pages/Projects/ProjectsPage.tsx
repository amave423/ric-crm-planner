import { useParams, useNavigate } from "react-router-dom";
import { getProjectsByDirection } from "../../api/projects";
import { getEventById } from "../../api/events";
import { getDirectionById } from "../../api/directions";

import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import BackButton from "../../components/UI/BackButton";

import "../../styles/page-colors.scss";

export default function ProjectsPage() {
  const { eventId, directionId } = useParams();
  const navigate = useNavigate();

  const eventIdNum = Number(eventId);
  const directionIdNum = Number(directionId);

  const event = getEventById(eventIdNum);
  const direction = getDirectionById(directionIdNum);
  const projects = getProjectsByDirection(directionIdNum);

  return (
    <div className="page page--projects">
      <TableHeader
        title={
          <>
            <BackButton
              onClick={() =>
                navigate(`/events/${eventId}/directions`)
              }
            />
            {`${event?.title || ""} / ${direction?.title || ""} — Проекты`}
          </>
        }
        showCreate
      />

      <Table
        columns={[
          { key: "title", title: "Название" },
          { key: "curator", title: "Куратор" },
          { key: "teams", title: "Команды" }
        ]}
        data={projects}
      />
    </div>
  );
}
