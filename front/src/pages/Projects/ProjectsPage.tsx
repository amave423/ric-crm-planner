import { useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProjectsByDirection } from "../../api/projects";
import { getEventById } from "../../api/events";
import { getDirectionById } from "../../api/directions";

import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import BackButton from "../../components/UI/BackButton";
import EventWizardModal, { type WizardLaunchContext } from "../../components/EventWizard/EventWizardModal";
import ApplyModal from "../../components/Requests/ApplyModal";
import InfoModal from "../../components/Modal/InfoModal";
import { AuthContext } from "../../context/AuthContext";
import { saveRequest } from "../../api/requests";
import { useToast } from "../../components/Toast/ToastProvider";
import { getRequests } from "../../api/requests";

import "../../styles/page-colors.scss";

export default function ProjectsPage() {
  const { eventId, directionId } = useParams();
  const navigate = useNavigate();

  const eventIdNum = Number(eventId);
  const directionIdNum = Number(directionId);

  const event = getEventById(eventIdNum);
  const direction = getDirectionById(directionIdNum);
  const projects = getProjectsByDirection(directionIdNum);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContext, setWizardContext] = useState<WizardLaunchContext | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const { showToast } = useToast();

  const { user } = useContext(AuthContext);
  const isStudent = user?.role === "student";

  // info modal states
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItem, setInfoItem] = useState<{ title?: string; description?: string } | null>(null);

  const filteredProjects = !search.trim()
    ? projects
    : projects.filter(p =>
        (p.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.curator || "").toLowerCase().includes(search.toLowerCase())
      );
    
  return (
    <div className="page page--projects">
      <TableHeader
        title={
          <>
            <BackButton onClick={() => navigate(`/events/${eventId}/directions`)} />
            {`${event?.title || ""} / ${direction?.title || ""} — Проекты`}
          </>
        }
        search={search}
        onSearch={setSearch}
        onCreate={() => {
          setMode("create");
          setWizardContext({
            type: "project",
            eventId: eventIdNum,
            directionId: directionIdNum
          });
          setWizardOpen(true);
        }}
      />

      <Table
        columns={[
          { key: "title", title: "Название" },
          { key: "curator", title: "Куратор" },
          { key: "teams", title: "Команды" }
        ]}
        data={filteredProjects}
        onEdit={(row) => {
          setMode("edit");
          setWizardContext({
            type: "project",
            eventId: eventIdNum,
            directionId: directionIdNum,
            projectId: row.id
          });
          setWizardOpen(true);
        }}
        onInfoClick={(row) => {
          setInfoItem({ title: (row as any).title || "—", description: (row as any).description || "Нет описания" });
          setInfoOpen(true);
        }}
        onRowClick={(row) => setSelectedProjectId(row.id)}
        selectedId={selectedProjectId ?? undefined}
      />

      {isStudent && selectedProjectId && (
        <div className="apply-container">
          <div
            className="apply-box"
            onClick={() => {
              const ownerId = user?.id;
              const existing = getRequests().find(r => r.ownerId === ownerId && r.projectId === selectedProjectId);
              if (existing) {
                showToast("error", "Вы уже отправляли заявку на этот проект");
                return;
              }
              setApplyOpen(true);
            }}
          >
            <h1 className="h1">Подать заявку</h1>
          </div>
        </div>
      )}

      {wizardOpen && wizardContext && (
        <EventWizardModal
          mode={mode}
          context={wizardContext}
          onClose={() => setWizardOpen(false)}
        />
      )}

      <ApplyModal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        projectId={selectedProjectId ?? undefined}
        projectTitle={projects.find((p) => p.id === selectedProjectId)?.title}
        eventId={eventIdNum}
        specializations={event?.specializations || []}
        onSubmit={(req) => {
          const ownerId = user?.id;
          if (ownerId) (req as any).ownerId = ownerId;

          const existing = getRequests().find(r => r.ownerId === ownerId && r.projectId === req.projectId);
          if (existing) {
              showToast("error", "Вы уже отправляли заявку на этот проект");
              return false;
          }

          saveRequest(req);
          showToast("success", "Заявка отправлена");
          return true;
        }}
      />

      <InfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={infoItem?.title}
        description={infoItem?.description}
      />
    </div>
  );
}