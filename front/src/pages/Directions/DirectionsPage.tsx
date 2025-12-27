import { useParams, useNavigate } from "react-router-dom";
import { getDirectionsByEvent } from "../../api/directions";
import { getEventById } from "../../api/events";
import { useState, useEffect } from "react";

import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import BackButton from "../../components/UI/BackButton";
import EventWizardModal, { type WizardLaunchContext } from "../../components/EventWizard/EventWizardModal";
import InfoModal from "../../components/Modal/InfoModal";

import "../../styles/page-colors.scss";

export default function DirectionsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const eventIdNum = Number(eventId);
  const [search, setSearch] = useState("");

  const [event, setEvent] = useState<any | null>(null);
  const [directions, setDirections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getEventById(eventIdNum), getDirectionsByEvent(eventIdNum)])
      .then(([ev, dirs]) => {
        if (!mounted) return;
        setEvent(ev || null);
        setDirections(dirs || []);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [eventIdNum]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContext, setWizardContext] = useState<WizardLaunchContext | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItem, setInfoItem] = useState<{ title?: string; description?: string } | null>(null);

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