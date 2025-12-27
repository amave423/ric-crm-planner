import { useState, useContext, useEffect } from "react";
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
import { saveRequest, getRequests as apiGetRequests } from "../../api/requests";
import { useToast } from "../../components/Toast/ToastProvider";

import "../../styles/page-colors.scss";

export default function ProjectsPage() {
  const { eventId, directionId } = useParams();
  const navigate = useNavigate();

  const eventIdNum = Number(eventId);
  const directionIdNum = Number(directionId);

  const [event, setEvent] = useState<any | null>(null);
  const [direction, setDirection] = useState<any | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getEventById(eventIdNum),
      getDirectionById(directionIdNum),
      getProjectsByDirection(directionIdNum),
      apiGetRequests()
    ])
      .then(([ev, dir, projs, reqs]) => {
        if (!mounted) return;
        setEvent(ev || null);
        setDirection(dir || null);
        setProjects(projs || []);
        setRequests(reqs || []);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [eventIdNum, directionIdNum]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContext, setWizardContext] = useState<WizardLaunchContext | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const { showToast } = useToast();

  const { user } = useContext(AuthContext);
  const isStudent = user?.role === "student";

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
              const existing = requests.find(r => r.ownerId === ownerId && r.projectId === selectedProjectId);
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
        onSubmit={async (req) => {
          const ownerId = user?.id;
          if (ownerId) (req as any).ownerId = ownerId;

          const existing = requests.find(r => r.ownerId === ownerId && r.projectId === req.projectId);
          if (existing) {
              showToast("error", "Вы уже отправляли заявку на этот проект");
              return false;
          }

          try {
            await saveRequest(req);
            showToast("success", "Заявка отправлена");
            const rs = await apiGetRequests();
            setRequests(rs || []);
            return true;
          } catch {
            showToast("error", "Ошибка при отправке заявки");
            return false;
          }
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