import { useNavigate } from "react-router-dom";
import { getEvents } from "../../api/events";
import { useState } from "react";

import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import EventWizardModal, { type WizardLaunchContext } from "../../components/EventWizard/EventWizardModal";
import InfoModal from "../../components/Modal/InfoModal";

import "../../styles/page-colors.scss";

export default function EventsPage() {
  const navigate = useNavigate();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContext, setWizardContext] = useState<WizardLaunchContext | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [search, setSearch] = useState("");

  const allEvents = getEvents();
  const events = !search.trim()
    ? allEvents
    : allEvents.filter(e =>
        (e.title || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (e.organizer || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (e.status || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      );

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItem, setInfoItem] = useState<{ title?: string; description?: string } | null>(null);

  return (
    <div className="page page--events">
      <TableHeader
        title="Мероприятия"
        search={search}
        onSearch={setSearch}
        onCreate={() => {
          setMode("create");
          setWizardContext({ type: "event" });
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
          setMode("edit");
          setWizardContext({ type: "event", eventId: row.id });
          setWizardOpen(true);
        }}
        onInfoClick={(row) => {
          setInfoItem({ title: (row as any).title || "—", description: (row as any).description || "Нет описания" });
          setInfoOpen(true);
        }}
      />

      {wizardOpen && wizardContext && (
        <EventWizardModal
          mode={mode}
          context={wizardContext}
          onClose={() => setWizardOpen(false)}
        />
      )}

      <InfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={infoItem?.title}
        description={infoItem?.description}
      />
    </div>
  );
}