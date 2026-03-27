import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../api/client";
import { getDirectionById } from "../../api/directions";
import { getEventById } from "../../api/events";
import { getProjectsByDirection } from "../../api/projects";
import { getRequests as apiGetRequests, saveRequest, updateRequestStatus } from "../../api/requests";
import EventWizardModal, { type WizardLaunchContext } from "../../components/EventWizard/EventWizardModal";
import TableHeader from "../../components/Layout/TableHeader";
import InfoModal from "../../components/Modal/InfoModal";
import Modal from "../../components/Modal/Modal";
import ApplyModal from "../../components/Requests/ApplyModal";
import Table from "../../components/Table/Table";
import { useToast } from "../../components/Toast/ToastProvider";
import BackButton from "../../components/UI/BackButton";
import { buildMockRequestTransitionUrl, REQUEST_STATUS } from "../../constants/requestProgress";
import { AuthContext } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { Direction } from "../../types/direction";
import type { Event } from "../../types/event";
import type { Project } from "../../types/project";
import type { Request as RequestType } from "../../types/request";
import "../../styles/page-colors.scss";

interface TestingImportMetaEnv {
  VITE_TESTING_URL?: string;
}

const TESTING_BASE_URL =
  ((import.meta as ImportMeta & { env?: TestingImportMetaEnv }).env?.VITE_TESTING_URL || "").trim() || "https://example.com/testing";

function buildTestingUrl(req: RequestType) {
  try {
    const url = new URL(TESTING_BASE_URL, window.location.origin);
    if (req.id) url.searchParams.set("applicationId", String(req.id));
    if (req.eventId) url.searchParams.set("eventId", String(req.eventId));
    if (req.directionId) url.searchParams.set("directionId", String(req.directionId));
    if (req.projectId) url.searchParams.set("projectId", String(req.projectId));
    if (req.ownerId) url.searchParams.set("ownerId", String(req.ownerId));
    return url.toString();
  } catch {
    return TESTING_BASE_URL;
  }
}

export default function ProjectsPage() {
  const { eventId, directionId } = useParams();
  const navigate = useNavigate();
  const eventIdNum = Number(eventId);
  const directionIdNum = Number(directionId);
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const { addNotification } = useNotifications();

  const isStudent = user?.role === "student";

  const [event, setEvent] = useState<Event | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(false);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContext, setWizardContext] = useState<WizardLaunchContext | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  const [testingPromptOpen, setTestingPromptOpen] = useState(false);
  const [testingPromptStep, setTestingPromptStep] = useState<"ask" | "info">("ask");
  const [pendingRequest, setPendingRequest] = useState<RequestType | null>(null);

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItem, setInfoItem] = useState<{ title?: string; description?: string } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const ownerId = user?.id;
    const role = user?.role;

    const [loadedEvent, loadedDirection, loadedProjects, loadedRequests] = await Promise.all([
      getEventById(eventIdNum).catch(() => null),
      getDirectionById(directionIdNum).catch(() => null),
      getProjectsByDirection(directionIdNum).catch(() => []),
      apiGetRequests({ ownerId, role }).catch(() => []),
    ]);

    setEvent(loadedEvent || null);
    setDirection(loadedDirection || null);
    setProjects(Array.isArray(loadedProjects) ? loadedProjects : []);
    setRequests(Array.isArray(loadedRequests) ? loadedRequests : []);
    setLoading(false);
  }, [directionIdNum, eventIdNum, user?.id, user?.role]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshRequests = useCallback(async () => {
    const rs = await apiGetRequests({ ownerId: user?.id, role: user?.role }).catch(() => []);
    setRequests(Array.isArray(rs) ? rs : []);
  }, [user?.id, user?.role]);

  const filteredProjects = !search.trim()
    ? projects
    : projects.filter(
        (project) =>
          (project.title || "").toLowerCase().includes(search.toLowerCase()) ||
          (project.curator || "").toLowerCase().includes(search.toLowerCase())
      );

  const closeTestingPrompt = () => {
    setTestingPromptOpen(false);
    setTestingPromptStep("ask");
    setPendingRequest(null);
  };

  const openLink = (url: string) => {
    const trimmed = url.trim();
    closeTestingPrompt();
    if (!trimmed) return;
    try {
      const nextUrl = new URL(trimmed, window.location.origin);
      if (nextUrl.origin === window.location.origin) {
        navigate(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
        return;
      }
    } catch {
    }
    window.location.assign(trimmed);
  };

  const startTestingScenario = async () => {
    if (!pendingRequest?.id) return;

    try {
      if (client.USE_MOCK) {
        await updateRequestStatus(Number(pendingRequest.id), REQUEST_STATUS.TESTING);
      }

      const link = client.USE_MOCK
        ? buildMockRequestTransitionUrl(Number(pendingRequest.id), REQUEST_STATUS.JOINED_CHAT, "testing")
        : buildTestingUrl(pendingRequest);

      addNotification({
        userId: user?.id,
        title: "Приглашение на тестирование",
        message: client.USE_MOCK
          ? "Откройте ссылку и подтвердите переход к следующему этапу."
          : "Для продолжения откройте ссылку и пройдите тест.",
        link,
      });

      await refreshRequests();
      openLink(link);
    } catch {
      showToast("error", "Не удалось запустить сценарий тестирования");
    }
  };

  const startDirectScenario = async () => {
    if (!pendingRequest?.id) return;

    const link = client.USE_MOCK
      ? buildMockRequestTransitionUrl(Number(pendingRequest.id), REQUEST_STATUS.STARTED, "start")
      : buildTestingUrl(pendingRequest);

    addNotification({
      userId: user?.id,
      title: "Ссылка для перехода к ПШ",
      message: "Откройте ссылку из центра уведомлений, чтобы продолжить работу с заявкой.",
      link,
    });

    setTestingPromptStep("info");
    await refreshRequests();
  };

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
          setWizardContext({ type: "project", eventId: eventIdNum, directionId: directionIdNum });
          setWizardOpen(true);
        }}
      />

      <Table
        columns={[
          { key: "title", title: "Название" },
          { key: "curator", title: "Куратор" },
          { key: "teams", title: "Команды" },
        ]}
        data={filteredProjects}
        onEdit={(row) => {
          setMode("edit");
          setWizardContext({
            type: "project",
            eventId: eventIdNum,
            directionId: directionIdNum,
            projectId: row.id,
          });
          setWizardOpen(true);
        }}
        onInfoClick={(row) => {
          setInfoItem({ title: row.title || "—", description: row.description || "Нет описания" });
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
              const existing = requests.find((request) => Number(request.ownerId) === Number(ownerId) && Number(request.projectId) === Number(selectedProjectId));
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
          onClose={() => {
            setWizardOpen(false);
            void loadAll();
          }}
        />
      )}

      <ApplyModal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        projectId={selectedProjectId ?? undefined}
        projectTitle={projects.find((project) => project.id === selectedProjectId)?.title}
        eventId={eventIdNum}
        directionId={directionIdNum}
        specializations={event?.specializations || []}
        onSubmit={async (request) => {
          const ownerId = user?.id;
          if (ownerId) request.ownerId = ownerId;

          const existing = requests.find((item) => Number(item.ownerId) === Number(ownerId) && Number(item.projectId) === Number(request.projectId));
          if (existing) {
            showToast("error", "Вы уже отправляли заявку на этот проект");
            return false;
          }

          try {
            const created = await saveRequest(request);
            setPendingRequest(created);
            setTestingPromptStep("ask");
            setTestingPromptOpen(true);
            showToast("success", "Заявка отправлена");
            await refreshRequests();
            return true;
          } catch {
            showToast("error", "Ошибка при отправке заявки");
            return false;
          }
        }}
      />

      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} title={infoItem?.title} description={infoItem?.description} />

      <Modal isOpen={testingPromptOpen} onClose={closeTestingPrompt} title="Переход по заявке">
        {testingPromptStep === "ask" ? (
          <div className="confirm-body">
            <div className="confirm-text">Перейти к прохождению теста?</div>
            <div className="confirm-actions">
              <button className="close-btn" onClick={startDirectScenario}>
                Нет
              </button>
              <button className="btn-send" onClick={startTestingScenario}>
                Да
              </button>
            </div>
          </div>
        ) : (
          <div className="confirm-body">
            <div className="confirm-text">Ссылка для перехода находится в центре уведомлений</div>
            <div className="confirm-actions">
              <button className="close-btn" onClick={closeTestingPrompt}>
                Понятно
              </button>
            </div>
          </div>
        )}
      </Modal>

      {loading && <div style={{ marginTop: 12 }}>Загрузка...</div>}
    </div>
  );
}
