import { useNavigate } from "react-router-dom";
import { getEvents } from "../../api/events";
import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import "../../styles/page-colors.scss";

export default function EventsPage() {
  const navigate = useNavigate();
  const events = getEvents();

  return (
    <div className="page page--events">
      <TableHeader
        title="Мероприятия"
        showCreate
      />

      <Table
        columns={[
          { key: "title", title: "Название" },
          { key: "startDate", title: "Дата начала" },
          { key: "endDate", title: "Дата окончания" },
          { key: "organizer", title: "Организатор" },
          { key: "status", title: "Статус" }
        ]}
        data={events}
        badgeKeys={["startDate", "endDate", "status"]}
        onRowClick={(row) =>
          navigate(`/events/${row.id}/directions`)
        }
      />
    </div>
  );
}
