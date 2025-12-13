import { useNavigate } from "react-router-dom";
import { getEvents } from "../../api/events";
import { useState } from "react";
import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import "../../styles/page-colors.scss";
import EventWizard from "../../components/EventWizard/EventWizardModal";

export default function EventsPage() {
  const navigate = useNavigate();
  const events = getEvents();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [search, setSearch] = useState("");

  return (
    <div className="page page--events">
      <TableHeader
        title="Мероприятия"
        search={search}
        onSearch={setSearch}
        onCreate={() => {
            setEditData(null);
            setWizardOpen(true);
        }}
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
        onEdit={(row) => {
            setEditData(row);
            setWizardOpen(true);
        }}
      />
      {wizardOpen && (
        <EventWizard
            mode={editData ? "edit" : "create"}
            initialData={editData}
            onClose={() => setWizardOpen(false)}
        />
        )}
    </div>
  );
}
