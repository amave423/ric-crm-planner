import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDirectionsByEvent } from "../../api/directions";
import { getEventById } from "../../api/events";
import EventWizardModal, { type WizardLaunchContext } from "../../components/EventWizard/EventWizardModal";
import TableHeader from "../../components/Layout/TableHeader";
import InfoModal from "../../components/Modal/InfoModal";
import Table from "../../components/Table/Table";
import BackButton from "../../components/UI/BackButton";
import type { Direction } from "../../types/direction";
import type { Event } from "../../types/event";
import "../../styles/page-colors.scss";

export default function DirectionsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const eventIdNum = Number(eventId);

  const [search, setSearch] = useState("");
  const [event, setEvent] = useState<Event | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContext, setWizardContext] = useState<WizardLaunchContext | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItem, setInfoItem] = useState<{ title?: string; description?: string } | null>(null);

  const loadDirections = useCallback(async () => {
    try {
      const [loadedEvent, loadedDirections] = await Promise.all([getEventById(eventIdNum), getDirectionsByEvent(eventIdNum)]);
      setEvent(loadedEvent || null);
      setDirections(loadedDirections || []);
    } catch {
      setEvent(null);
      setDirections([]);
    }
  }, [eventIdNum]);

  useEffect(() => {
    void loadDirections();
  }, [loadDirections]);

  const filteredDirections = !search.trim()
    ? directions
    : directions.filter(
        (direction) =>
          (direction.title || "").toLowerCase().includes(search.toLowerCase()) ||
          (direction.organizer || "").toLowerCase().includes(search.toLowerCase())
      );

  return (
    <div className="page page--directions">
      <TableHeader
        title={
          <>
            <BackButton onClick={() => navigate("/events")} />
            {`${event?.title || "Мероприятие"} - Направления`}
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
          { key: "organizer", title: "Организатор" },
        ]}
        data={filteredDirections}
        onRowClick={(row) => navigate(`/events/${eventId}/directions/${row.id}/projects`)}
        onEdit={(row) => {
          setMode("edit");
          setWizardContext({
            type: "direction",
            eventId: eventIdNum,
            directionId: row.id,
          });
          setWizardOpen(true);
        }}
        onInfoClick={(row) => {
          setInfoItem({ title: row.title || "-", description: row.description || "Нет описания" });
          setInfoOpen(true);
        }}
      />

      {wizardOpen && wizardContext && (
        <EventWizardModal
          mode={mode}
          context={wizardContext}
          onClose={() => {
            setWizardOpen(false);
            void loadDirections();
          }}
        />
      )}

      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} title={infoItem?.title} description={infoItem?.description} />
    </div>
  );
}

